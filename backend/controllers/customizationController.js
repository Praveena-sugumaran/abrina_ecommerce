const ProductCustomizationRequest = require('../models/ProductCustomizationRequest');
const Product = require('../models/Product');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');

// ─── BUYER: Create Customization Request ─────────────────────────────────────
exports.createCustomizationRequest = async (req, res) => {
    try {
        const {
            productId,
            buyer_name,
            buyer_email,
            buyer_phone,
            customization_type,
            quantity,
            customization_details,
            expected_delivery_date,
            budget_range
        } = req.body;

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!buyer_email || !emailRegex.test(buyer_email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Phone validation
        const phoneParts = (buyer_phone || '').trim().split(' ');
        const dialCode = phoneParts[0];
        const nationalNumber = phoneParts.slice(1).join('').replace(/\D/g, '');

        if (!dialCode || !nationalNumber) {
            return res.status(400).json({ message: 'Please provide a valid phone number with dial code' });
        }

        const Country = require('../models/Country');
        const countryObj = await Country.findOne({
            $or: [
                { dial_code: dialCode },
                { dial_code: '+' + dialCode.replace('+', '') }
            ]
        });

        if (countryObj) {
            const expectedLength = countryObj.phone_length || 10;
            if (nationalNumber.length !== expectedLength) {
                return res.status(400).json({ message: `Phone number must be exactly ${expectedLength} digits for ${countryObj.name}` });
            }
        } else {
            if (nationalNumber.length < 7 || nationalNumber.length > 15) {
                return res.status(400).json({ message: 'Phone number must be a valid number between 7 and 15 digits' });
            }
        }

        // Expected Delivery Date validation
        if (!expected_delivery_date) {
            return res.status(400).json({ message: 'Expected delivery date is required' });
        }
        const deliveryDate = new Date(expected_delivery_date);
        if (isNaN(deliveryDate.getTime())) {
            return res.status(400).json({ message: 'Invalid expected delivery date' });
        }
        const tomorrowDate = new Date();
        tomorrowDate.setHours(0, 0, 0, 0);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        if (deliveryDate < tomorrowDate) {
            return res.status(400).json({ message: 'Expected delivery date must be at least tomorrow' });
        }
        
        // Enforce max 1 year in the future
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        if (deliveryDate > maxDate) {
            return res.status(400).json({ message: 'Expected delivery date cannot be more than 1 year in the future' });
        }

        const product = await Product.findById(productId).populate('supplier');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const supplierId = product.supplier._id || product.supplier;
        const buyerId = req.user._id;

        // Ensure buyer and supplier are different users
        if (buyerId.toString() === supplierId.toString()) {
            return res.status(400).json({ message: 'Suppliers cannot request customization on their own products' });
        }

        let reference_file = '';
        if (req.file) {
            reference_file = `/uploads/customization/${req.file.filename}`;
        }

        // 1. Create or Find Conversation
        let conversation = await Conversation.findOne({
            buyer_id: buyerId,
            supplier_id: supplierId
        });

        if (!conversation) {
            conversation = await Conversation.create({
                buyer_id: buyerId,
                supplier_id: supplierId
            });
        }

        // 2. Post a Message to Chat with Product Context
        const chatMsg = `Hello! I have submitted a Customization Request for your product "${product.name}".\n\n` +
                        `• Type: ${customization_type}\n` +
                        `• Quantity: ${quantity} units\n` +
                        `• Budget: ${budget_range}\n` +
                        `• Details: ${customization_details}`;

        const newMessage = await Message.create({
            conversationId: conversation._id,
            senderId: buyerId,
            receiverId: supplierId,
            content: chatMsg,
            messageType: 'text',
            productDetails: {
                productId: product._id,
                name: product.name,
                price: product.main_price,
                image: product.main_image
            }
        });

        conversation.lastMessage = newMessage._id;
        await conversation.save();

        // 3. Create Customization Record
        const customizationRequest = await ProductCustomizationRequest.create({
            product: productId,
            supplier: supplierId,
            buyer: buyerId,
            buyer_name,
            buyer_email,
            buyer_phone,
            customization_type,
            quantity: Number(quantity),
            customization_details,
            reference_file,
            expected_delivery_date: new Date(expected_delivery_date),
            budget_range,
            status: 'pending',
            conversation: conversation._id
        });

        // 4. Send socket notification to Supplier
        const io = req.app.get('io');
        if (io) {
            await sendNotification(
                io,
                supplierId,
                'New Customization Request',
                `Buyer "${buyer_name}" requested customized specifications for "${product.name}".`,
                'customization',
                `/supplier/dashboard/customizations`
            );
            // Push message to active chat if connected
            io.to(supplierId.toString()).emit('messageReceived', newMessage);
        }

        // 5. Queue Email notification to Supplier
        try {
            const { enqueueTemplatedMail } = require('../services/mailService');
            const supplierUser = await User.findById(supplierId);
            if (supplierUser && supplierUser.email) {
                enqueueTemplatedMail('new-inquiry-received', supplierUser.email, {
                    first_name: supplierUser.first_name || 'Supplier',
                    buyer_name,
                    product_name: product.name,
                    subject: `Customization Request: ${customization_type}`,
                    quantity,
                    unit: 'pieces',
                    message: `Customization specs requested:\n${customization_details}\n\nBudget: ${budget_range}\nExpected delivery: ${expected_delivery_date}`,
                    inquiry_url: `${process.env.FRONTEND_URL}/supplier/dashboard/customizations`
                }).catch(e => console.error('Customization email notify error:', e));
            }
        } catch (mailErr) {
            console.error('Customization email notification error:', mailErr);
        }

        res.status(201).json(customizationRequest);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── BUYER & SUPPLIER: Get My Requests ────────────────────────────────────────
exports.getMyCustomizationRequests = async (req, res) => {
    try {
        const isSupplier = req.user.roles?.includes('supplier') || req.user.role === 'supplier';
        const isBuyer = req.user.roles?.includes('buyer') || req.user.role === 'buyer';

        let query = {};
        if (isSupplier && isBuyer) {
            query = { $or: [{ supplier: req.user._id }, { buyer: req.user._id }] };
        } else if (isSupplier) {
            query = { supplier: req.user._id };
        } else {
            query = { buyer: req.user._id };
        }

        const requests = await ProductCustomizationRequest.find(query)
            .populate('product', 'name main_image main_price')
            .populate('buyer', 'first_name last_name company_name country_code')
            .populate('supplier', 'first_name last_name company_name country_code')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── SUPPLIER: Update Customization Request Status/Quotation ──────────────────
exports.updateCustomizationRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, supplier_note, quotation_price } = req.body;

        const request = await ProductCustomizationRequest.findById(id)
            .populate('product', 'name')
            .populate('buyer', 'email first_name last_name');

        if (!request) {
            return res.status(404).json({ message: 'Customization Request not found' });
        }

        // Verify permissions: Supplier can update, or Buyer can update (if approving/rejecting a quote)
        const isSupplier = request.supplier.toString() === req.user._id.toString();
        const isBuyer = request.buyer._id.toString() === req.user._id.toString();

        if (!isSupplier && !isBuyer) {
            return res.status(403).json({ message: 'Unauthorized. You are not part of this request.' });
        }

        // Specific rules for buyers (e.g. only allow status changes if quoted)
        if (isBuyer && !isSupplier) {
            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ message: 'Buyers can only Approve or Reject a quotation.' });
            }
            if (request.status !== 'quoted' && status === 'approved') {
                return res.status(400).json({ message: 'You can only approve a request that has been Quoted by the supplier.' });
            }
        }

        if (status) request.status = status;
        if (supplier_note) request.supplier_note = supplier_note;
        if (quotation_price) request.quotation_price = Number(quotation_price);

        if (req.file) {
            request.quotation_file = `/uploads/customization/${req.file.filename}`;
        }

        await request.save();

        // Send a message to chat to let the buyer know it was reviewed/quoted
        let conversation = await Conversation.findById(request.conversation);
        if (!conversation) {
            conversation = await Conversation.findOne({
                buyer_id: request.buyer._id,
                supplier_id: req.user._id
            });
        }

        if (conversation) {
            let statusText = `Customization Request Status Updated to: **${request.status.toUpperCase()}**\n\n`;
            if (supplier_note) statusText += `• Note: ${supplier_note}\n`;
            if (quotation_price) statusText += `• Quote Price: $${quotation_price} per unit\n`;
            if (request.quotation_file) statusText += `• Quotation Attachment uploaded.`;

            const receiverId = isSupplier ? request.buyer._id : request.supplier._id;
            
            const updateMsg = await Message.create({
                conversationId: conversation._id,
                senderId: req.user._id,
                receiverId: receiverId,
                content: statusText,
                messageType: 'text'
            });

            conversation.lastMessage = updateMsg._id;
            await conversation.save();

            // Emit via socket
            const io = req.app.get('io');
            if (io) {
                io.to(receiverId.toString()).emit('messageReceived', updateMsg);
            }
        }

        // Real-time socket notification
        const io = req.app.get('io');
        if (io) {
            const notifyReceiver = isSupplier ? request.buyer._id : request.supplier._id;
            const targetUrl = isSupplier ? `/dashboard/customizations` : `/supplier/dashboard/customizations`;
            
            await sendNotification(
                io,
                notifyReceiver,
                'Customization Request Updated',
                `${req.user.first_name} updated status to "${request.status}" for "${request.product.name}".`,
                'customization',
                targetUrl
            );
        }

        // Email Notification to Buyer
        try {
            const { enqueueTemplatedMail } = require('../services/mailService');
            if (request.buyer && request.buyer.email) {
                enqueueTemplatedMail('new-inquiry-received', request.buyer.email, {
                    first_name: request.buyer.first_name || 'Buyer',
                    buyer_name: req.user.company_name || `${req.user.first_name} ${req.user.last_name}`,
                    product_name: request.product.name,
                    subject: `Customization Status Update: ${request.status.toUpperCase()}`,
                    quantity: request.quantity,
                    unit: 'pieces',
                    message: `Your customization request status is updated to ${request.status}.\n\nQuote details:\nPrice: ${quotation_price ? '$' + quotation_price : 'N/A'}\nSupplier message: ${supplier_note || 'None'}`,
                    inquiry_url: `${process.env.FRONTEND_URL}/dashboard/customizations`
                }).catch(e => console.error('Customization update email notify error:', e));
            }
        } catch (mailErr) {
            console.error('Customization update email error:', mailErr);
        }

        res.json(request);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── ADMIN: Get All Customization Requests ────────────────────────────────────
exports.getAdminCustomizationRequests = async (req, res) => {
    try {
        const { status, supplierId } = req.query;

        let query = {};
        if (status) query.status = status;
        if (supplierId) query.supplier = supplierId;

        const requests = await ProductCustomizationRequest.find(query)
            .populate('product', 'name main_image main_price')
            .populate('buyer', 'first_name last_name company_name email')
            .populate('supplier', 'first_name last_name company_name email')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─── ADMIN: Change Status manually / delete ────────────────────────────────────
exports.adminDeleteCustomizationRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await ProductCustomizationRequest.findByIdAndDelete(id);
        res.json({ message: 'Customization Request deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
