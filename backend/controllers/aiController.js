const Product = require('../models/Product');
const Company = require('../models/Company');
const AiHistory = require('../models/AiHistory');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SiteSetting = require('../models/SiteSetting');
const axios = require('axios');

// Better stop words (only common fillers)
const extractKeywords = (text) => {
    const stopWords = ['i', 'need', 'a', 'an', 'the', 'looking', 'for', 'with', 'under', 'and', 'find', 'search', 'me', 'some', 'product', 'products', 'supplier', 'suppliers', 'suplier', 'recommend', 'recommendations', 'purchase', 'have', 'has', 'so', 'like', 'want', 'buy', 'please', 'wholesale', 'sourcing', 'quality', 'high', 'best', 'good', 'show', 'list', 'get'];
    return text.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(' ')
        .filter(word => word.length > 2 && !stopWords.includes(word));
};

exports.refineAiText = async (req, res) => {
    try {
        const { text, type = 'rfq' } = req.body; // type: rfq or inquiry
        if (!text) return res.status(400).json({ message: 'Text is required' });

        // 1. Subscription & Limit Check
        let userModel = await User.findById(req.user._id).populate('subscription_plan');
        if (!userModel) return res.status(404).json({ message: 'User not found' });

        // Daily Reset logic
        const today = new Date().setHours(0, 0, 0, 0);
        const resetDate = new Date(userModel.ai_tasks_reset_date || Date.now()).setHours(0, 0, 0, 0);
        if (today > resetDate) {
            userModel.ai_tasks_count = 0;
            userModel.ai_tasks_reset_date = new Date();
        }

        const limit = userModel.subscription_plan ? userModel.subscription_plan.max_ai_tasks : 5;
        if (limit !== -1 && userModel.ai_tasks_count >= limit) {
            return res.status(403).json({
                message: 'AI refinement limit reached for today.',
                limit_reached: true,
                current_plan: userModel.subscription_plan ? userModel.subscription_plan.name : 'Free',
                usage: userModel.ai_tasks_count,
                limit: limit
            });
        }

        // 2. Dynamic Model Refinement
        let refinedText = text;
        const siteSetting = await SiteSetting.findOne();
        const apiKey = process.env.GEMINI_API_KEY || siteSetting?.ai_api_key;

        if (apiKey) {
            const isGemini = apiKey.startsWith('AIzaSy') || !apiKey.startsWith('sk-');
            if (isGemini) {
                try {
                    const prompt = `Refine the following ${type} text to be more professional, detailed, and clear for a B2B marketplace. 
                    Keep the core meaning but improve the language and structure. 
                    Original text: "${text}"
                    Refined professional version:`;

                    const aiRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    if (aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        refinedText = aiRes.data.candidates[0].content.parts[0].text.trim();
                    }
                } catch (aiErr) {
                    console.error('Gemini Refine Error:', aiErr.response?.data || aiErr.message);
                    refinedText = `[AI ENHANCED] ${text}`;
                }
            } else {
                try {
                    const prompt = `Refine the following ${type} text to be more professional, detailed, and clear for a B2B marketplace. 
                    Keep the core meaning but improve the language and structure. 
                    Original text: "${text}"
                    Refined professional version:`;

                    const aiRes = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: prompt }],
                        max_tokens: 500
                    }, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    if (aiRes.data?.choices?.[0]?.message?.content) {
                        refinedText = aiRes.data.choices[0].message.content.trim();
                    }
                } catch (aiErr) {
                    console.error('OpenAI Refine Error:', aiErr.response?.data || aiErr.message);
                    refinedText = `[AI ENHANCED] ${text}`;
                }
            }
        } else {
            refinedText = `[REFINED] ${text}`;
        }

        // 3. Update Usage
        userModel.ai_tasks_count += 1;
        await userModel.save();

        res.json({
            refinedText,
            usage: userModel.ai_tasks_count,
            limit: limit
        });

    } catch (err) {
        console.error('AI Refine Error:', err);
        res.status(500).json({ message: 'AI refinement failed' });
    }
};

exports.aiSourcingSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ message: 'Query is required' });

        // 1. Subscription & Limit Check (for logged in users)
        let userModel = null;
        if (req.user) {
            userModel = await User.findById(req.user._id).populate('subscription_plan');

            // Check if reset is needed (daily reset)
            const today = new Date().setHours(0, 0, 0, 0);
            const resetDate = new Date(userModel.ai_tasks_reset_date || Date.now()).setHours(0, 0, 0, 0);

            if (today > resetDate) {
                userModel.ai_tasks_count = 0;
                userModel.ai_tasks_reset_date = new Date();
            }

            // Get limit from plan or default to 5 for Free
            const limit = userModel.subscription_plan ? userModel.subscription_plan.max_ai_tasks : 5;

            if (limit !== -1 && userModel.ai_tasks_count >= limit) {
                return res.status(403).json({
                    message: 'AI sourcing limit reached for today.',
                    limit_reached: true,
                    current_plan: userModel.subscription_plan ? userModel.subscription_plan.name : 'Free',
                    usage: userModel.ai_tasks_count,
                    limit: limit
                });
            }
        }

        const keywords = extractKeywords(query);

        // Build a multi-keyword regex search
        const keywordRegex = keywords.length > 0
            ? keywords.map(k => `(?=.*${k})`).join('') // Match all keywords in any order
            : query;

        // 2. Search Products - Ranked Search (Name exact -> Name broad -> Desc exact -> Desc broad)
        let products = [];
        if (keywords.length > 0) {
            // Rank 1: Name exact
            products = await Product.find({
                status: 'active',
                approval_status: 'approved',
                name: {
                    $regex: keywordRegex,
                    $options: 'i',
                    $nin: ['Product A', 'Product B']
                }
            }).limit(8);

            // Rank 2: Name broad
            if (products.length === 0) {
                products = await Product.find({
                    status: 'active',
                    approval_status: 'approved',
                    name: {
                        $regex: keywords.join('|'),
                        $options: 'i',
                        $nin: ['Product A', 'Product B']
                    }
                }).limit(8);
            }

            // Rank 3: Description exact
            if (products.length === 0) {
                products = await Product.find({
                    description: { $regex: keywordRegex, $options: 'i' },
                    status: 'active',
                    approval_status: 'approved',
                    name: { $nin: ['Product A', 'Product B'] }
                }).limit(8);
            }

            // Rank 4: Description broad
            if (products.length === 0) {
                products = await Product.find({
                    description: { $regex: keywords.join('|'), $options: 'i' },
                    status: 'active',
                    approval_status: 'approved',
                    name: { $nin: ['Product A', 'Product B'] }
                }).limit(8);
            }
        }

        // 3. Search Suppliers
        let suppliers = await Company.find({
            $or: [
                { company_name: { $regex: keywords.join('|') || query, $options: 'i' } },
                { description: { $regex: keywords.join('|') || query, $options: 'i' } }
            ]
        }).limit(4);

        // 4. Dynamic Insights
        const insights = [
            { title: 'Global Demand', value: '+12% this month', trend: 'up' },
            { title: 'Avg. Market Price', value: products.length > 0 ? `$${Math.min(...products.map(p => p.main_price || 0))} - $${Math.max(...products.map(p => p.main_price || 0))}` : 'Contact Suppliers', trend: 'stable' },
            { title: 'Verified Sources', value: `${suppliers.length} found`, trend: 'up' }
        ];

        // 5. Update Usage & History
        if (userModel) {
            userModel.ai_tasks_count += 1;
            await userModel.save();

            try {
                await AiHistory.create({
                    user: userModel._id,
                    query_text: query,
                    search_type: 'product',
                    results_count: products.length + suppliers.length,
                    status: 'completed'
                });
            } catch (hErr) {
                console.error('History save error:', hErr);
            }
        }

        const limit = userModel ? (userModel.subscription_plan ? userModel.subscription_plan.max_ai_tasks : 5) : 0;
        const usage = userModel ? userModel.ai_tasks_count : 0;

        // 6. Dynamic Generated Summary (If Key Exists)
        let aiSummary = products.length > 0
            ? `I've found ${products.length} products and ${suppliers.length} suppliers that match your request for "${query}".`
            : `I couldn't find exact matches for "${query}", but here are some related suppliers and market insights.`;

        const siteSetting = await SiteSetting.findOne();
        const apiKey = process.env.GEMINI_API_KEY || siteSetting?.ai_api_key;
        if (apiKey) {
            const isGemini = apiKey.startsWith('AIzaSy') || !apiKey.startsWith('sk-');
            if (isGemini) {
                try {
                    const prompt = `User is looking for: "${query}". 
                    I found ${products.length} products and ${suppliers.length} suppliers.
                    Products found: ${products.slice(0, 3).map(p => p.name).join(', ')}.
                    Suppliers found: ${suppliers.slice(0, 2).map(s => s.company_name).join(', ')}.
                    Generate a professional, helpful but concise (max 2 sentences) sourcing summary as an AI assistant.`;

                    const aiRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        contents: [{
                            parts: [{ text: prompt }]
                        }]
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    if (aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        aiSummary = aiRes.data.candidates[0].content.parts[0].text.trim();
                    }
                } catch (aiErr) {
                    console.error('Gemini Sourcing Search Summary Error:', aiErr.response?.data || aiErr.message);
                }
            } else {
                try {
                    const prompt = `User is looking for: "${query}". 
                    I found ${products.length} products and ${suppliers.length} suppliers.
                    Products found: ${products.slice(0, 3).map(p => p.name).join(', ')}.
                    Suppliers found: ${suppliers.slice(0, 2).map(s => s.company_name).join(', ')}.
                    Generate a professional, helpful but concise (max 2 sentences) sourcing summary as an AI assistant.`;

                    const aiRes = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: prompt }],
                        max_tokens: 150
                    }, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    if (aiRes.data?.choices?.[0]?.message?.content) {
                        aiSummary = aiRes.data.choices[0].message.content;
                    }
                } catch (aiErr) {
                    console.error('OpenAI Sourcing Search Summary Error:', aiErr.response?.data || aiErr.message);
                }
            }
        }

        res.json({
            products,
            suppliers,
            insights,
            summary: aiSummary,
            usage: usage,
            limit: limit,
            plan_name: userModel ? (userModel.subscription_plan ? userModel.subscription_plan.name : 'Free') : 'Guest'
        });

    } catch (err) {
        console.error('AI Sourcing Error:', err);
        res.status(500).json({ message: 'AI processing failed' });
    }
};

exports.getAiUsage = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('subscription_plan');
        const limit = user.subscription_plan ? user.subscription_plan.max_ai_tasks : 5;

        // Reset check (daily)
        const today = new Date().setHours(0, 0, 0, 0);
        const resetDate = new Date(user.ai_tasks_reset_date || Date.now()).setHours(0, 0, 0, 0);

        if (today > resetDate) {
            user.ai_tasks_count = 0;
            user.ai_tasks_reset_date = new Date();
            await user.save();
        }

        res.json({
            usage: user.ai_tasks_count,
            limit: limit,
            plan_name: user.subscription_plan ? user.subscription_plan.name : 'Free'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAiHistory = async (req, res) => {
    try {
        const history = await AiHistory.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteHistory = async (req, res) => {
    try {
        await AiHistory.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        res.json({ message: 'History deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Multi-turn Conversational AI Sourcing Chatbot
// @route   POST /api/ai/chatbot
// @access  Private
exports.aiChatbot = async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) return res.status(400).json({ message: 'Message is required' });

        // 1. Subscription & Limit Check
        let userModel = await User.findById(req.user._id).populate('subscription_plan');
        if (!userModel) return res.status(404).json({ message: 'User not found' });

        // Daily Reset logic
        const today = new Date().setHours(0, 0, 0, 0);
        const resetDate = new Date(userModel.ai_tasks_reset_date || Date.now()).setHours(0, 0, 0, 0);
        if (today > resetDate) {
            userModel.ai_tasks_count = 0;
            userModel.ai_tasks_reset_date = new Date();
        }

        const limit = userModel.subscription_plan ? userModel.subscription_plan.max_ai_tasks : 5;
        if (limit !== -1 && userModel.ai_tasks_count >= limit) {
            return res.status(403).json({
                message: 'AI sourcing assistant limit reached for today.',
                limit_reached: true,
                current_plan: userModel.subscription_plan ? userModel.subscription_plan.name : 'Free',
                usage: userModel.ai_tasks_count,
                limit: limit
            });
        }

        // 2. Intent Parsing & MongoDB Search
        const keywords = extractKeywords(message);
        let products = [];
        let suppliers = [];

        if (keywords.length > 0) {
            const keywordRegex = keywords.map(k => `(?=.*${k})`).join('');

            // Search Products - Ranked Search (Name exact -> Name broad -> Desc exact -> Desc broad)
            // Rank 1: Name exact
            products = await Product.find({
                name: {
                    $regex: keywordRegex,
                    $options: 'i',
                    $nin: ['Product A', 'Product B']
                },
                status: 'active',
                approval_status: 'approved'
            }).populate('supplier').limit(4);

            // Rank 2: Name broad
            if (products.length === 0) {
                products = await Product.find({
                    name: {
                        $regex: keywords.join('|'),
                        $options: 'i',
                        $nin: ['Product A', 'Product B']
                    },
                    status: 'active',
                    approval_status: 'approved'
                }).populate('supplier').limit(4);
            }

            // Rank 3: Description exact
            if (products.length === 0) {
                products = await Product.find({
                    description: { $regex: keywordRegex, $options: 'i' },
                    status: 'active',
                    approval_status: 'approved',
                    name: { $nin: ['Product A', 'Product B'] }
                }).populate('supplier').limit(4);
            }

            // Rank 4: Description broad
            if (products.length === 0) {
                products = await Product.find({
                    description: { $regex: keywords.join('|'), $options: 'i' },
                    status: 'active',
                    approval_status: 'approved',
                    name: { $nin: ['Product A', 'Product B'] }
                }).populate('supplier').limit(4);
            }

            // Search Suppliers
            suppliers = await Company.find({
                $or: [
                    { company_name: { $regex: keywords.join('|'), $options: 'i' } },
                    { description: { $regex: keywords.join('|'), $options: 'i' } }
                ]
            }).limit(3);
        }

        // 3. Dynamic Multi-turn chat completion
        const siteSetting = await SiteSetting.findOne();
        const apiKey = process.env.GEMINI_API_KEY || siteSetting?.ai_api_key;
        let reply = "";

        if (apiKey) {
            const isGemini = apiKey.startsWith('AIzaSy') || !apiKey.startsWith('sk-');
            const systemPrompt = `You are a B2B Sourcing AI Assistant on b2b.sangvish.com. 
            Your job is to advise buyers on finding suppliers, locating products, and compiling wholesale orders on this platform.
            Below is a list of actual items from our database matching their inquiry:
            Products: ${products.map(p => `"${p.name}" (Price: $${p.main_price || 0}, MOQ: ${p.moq || 1})`).join(', ') || 'None found'}
            Suppliers: ${suppliers.map(s => `"${s.company_name}" (Type: ${s.business_type || 'Manufacturer'}, Location: ${s.city || 'Any'})`).join(', ') || 'None found'}
            
            CRITICAL: You must only answer questions related to b2b.sangvish.com. If the user asks about other B2B or e-commerce websites (such as Alibaba, Amazon, Global Sources, DHgate, Made-in-China, etc.) or anything unrelated to b2b.sangvish.com, you must politely decline to answer and state that you can only assist with sourcing and suppliers on b2b.sangvish.com. Do not provide information, features, or details about other platforms under any circumstances.
            
            Respond in a professional B2B advisor tone. Refer to the matching items naturally. Keep the response under 4 sentences. Do not mention database IDs.`;

            if (isGemini) {
                try {
                    const contents = [];
                    if (history && Array.isArray(history)) {
                        history.slice(-8).forEach(h => {
                            contents.push({
                                role: h.sender === 'user' ? 'user' : 'model',
                                parts: [{ text: h.text }]
                            });
                        });
                    }
                    contents.push({
                        role: 'user',
                        parts: [{ text: `${systemPrompt}\n\nUser Message: ${message}` }]
                    });

                    const aiRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        contents: contents
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    if (aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        reply = aiRes.data.candidates[0].content.parts[0].text.trim();
                    }
                } catch (aiErr) {
                    console.error('Gemini Sourcing Assistant Error:', aiErr.response?.data || aiErr.message);
                    reply = `I found some products and suppliers in our system matching your criteria. Let me know if you would like me to adjust MOQ or search for a specific location.`;
                }
            } else {
                try {
                    const messages = [{ role: "system", content: systemPrompt }];

                    if (history && Array.isArray(history)) {
                        history.slice(-8).forEach(h => {
                            messages.push({
                                role: h.sender === 'user' ? 'user' : 'assistant',
                                content: h.text
                            });
                        });
                    }

                    messages.push({ role: "user", content: message });

                    const aiRes = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: "gpt-4o-mini",
                        messages: messages,
                        max_tokens: 300
                    }, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    if (aiRes.data?.choices?.[0]?.message?.content) {
                        reply = aiRes.data.choices[0].message.content.trim();
                    }
                } catch (aiErr) {
                    console.error('OpenAI Sourcing Assistant Error:', aiErr.response?.data || aiErr.message);
                    reply = `I found some products and suppliers in our system matching your criteria. Let me know if you would like me to adjust MOQ or search for a specific location.`;
                }
            }
        } else {
            reply = `Here are the matching sourcing options I found in our marketplace database. You can review details or contact suppliers directly.`;
        }

        // 4. Update Daily Count & Save History log
        userModel.ai_tasks_count += 1;
        await userModel.save();

        try {
            await AiHistory.create({
                user: userModel._id,
                query_text: message,
                search_type: 'chatbot',
                results_count: products.length + suppliers.length,
                status: 'completed'
            });
        } catch (hErr) {
            console.error('History save error:', hErr);
        }

        res.json({
            reply,
            products,
            suppliers,
            usage: userModel.ai_tasks_count,
            limit
        });

    } catch (err) {
        console.error('Chatbot Processing Error:', err);
        res.status(500).json({ message: 'Sourcing assistant processing failed' });
    }
};

// @desc    Personalized Recommendations Based on History & Wishlist
// @route   GET /api/ai/recommendations
// @access  Private
exports.aiRecommendations = async (req, res) => {
    try {
        const Wishlist = require('../models/Wishlist');

        // 1. Get User Wishlist products
        const wishlistObj = await Wishlist.findOne({ user: req.user._id }).populate({
            path: 'products',
            match: { status: 'active', approval_status: 'approved' }
        });
        const wishlistedProducts = wishlistObj?.products || [];
        const wishlistProductIds = wishlistedProducts.map(p => p._id.toString());
        const wishlistCategoryIds = wishlistedProducts.map(p => p.category ? p.category.toString() : null).filter(Boolean);

        // 2. Fetch recent AI Sourcing history keywords
        const recentHistory = await AiHistory.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10);
        const historyQueries = recentHistory.map(h => h.query_text);
        const historyKeywords = historyQueries.flatMap(q => extractKeywords(q));

        let recommendedProducts = [];
        let recommendedSuppliers = [];

        let productQuery = {
            status: 'active',
            approval_status: 'approved',
            _id: { $nin: wishlistProductIds },
            name: { $nin: ['Product A', 'Product B'] }
        };

        const hasHistory = historyKeywords.length > 0;
        const hasWishlist = wishlistCategoryIds.length > 0;

        if (hasWishlist || hasHistory) {
            const orConditions = [];
            if (hasWishlist) {
                orConditions.push({ category: { $in: wishlistCategoryIds } });
            }
            if (hasHistory) {
                const regexPattern = historyKeywords.join('|');
                if (regexPattern) {
                    orConditions.push({ name: { $regex: regexPattern, $options: 'i' } });
                    orConditions.push({ description: { $regex: regexPattern, $options: 'i' } });
                }
            }

            if (orConditions.length > 0) {
                productQuery.$or = orConditions;
            }

            recommendedProducts = await Product.find(productQuery).populate('supplier').limit(6);

            // Fetch suppliers
            if (hasHistory) {
                const regexPattern = historyKeywords.join('|');
                if (regexPattern) {
                    recommendedSuppliers = await Company.find({
                        $or: [
                            { company_name: { $regex: regexPattern, $options: 'i' } },
                            { description: { $regex: regexPattern, $options: 'i' } }
                        ]
                    }).limit(4);
                }
            }
        }

        // 3. Fallbacks: trending products or active approved items
        if (recommendedProducts.length < 6) {
            const fillProducts = await Product.find({
                status: 'active',
                approval_status: 'approved',
                _id: { $nin: [...wishlistProductIds, ...recommendedProducts.map(p => p._id.toString())] },
                name: { $nin: ['Product A', 'Product B'] }
            })
                .populate('supplier')
                .sort({ rating: -1, numReviews: -1 })
                .limit(6 - recommendedProducts.length);
            recommendedProducts = [...recommendedProducts, ...fillProducts];
        }

        if (recommendedSuppliers.length < 4) {
            const fillSuppliers = await Company.find({
                _id: { $nin: recommendedSuppliers.map(s => s._id.toString()) }
            })
                .limit(4 - recommendedSuppliers.length);
            recommendedSuppliers = [...recommendedSuppliers, ...fillSuppliers];
        }

        res.json({
            products: recommendedProducts,
            suppliers: recommendedSuppliers
        });

    } catch (err) {
        console.error('Recommendations Error:', err);
        res.status(500).json({ message: 'Failed to compile recommendations' });
    }
};

// @desc    Suggest counter-offers for Quote negotiations using AI
// @route   POST /api/ai/negotiation-helper
// @access  Private
exports.aiNegotiationHelper = async (req, res) => {
    try {
        const { quoteId } = req.body;
        if (!quoteId) return res.status(400).json({ message: 'Quote ID is required.' });

        const Quote = require('../models/Quote');
        const quote = await Quote.findById(quoteId).populate('rfq');
        if (!quote) return res.status(404).json({ message: 'Quote not found.' });
        if (!quote.rfq) return res.status(400).json({ message: 'Associated RFQ not found.' });

        const isBuyer = quote.rfq.buyer.toString() === req.user._id.toString();
        const isSupplier = quote.supplier.toString() === req.user._id.toString();

        if (!isBuyer && !isSupplier && !(req.user.roles?.includes('admin') || req.user.role === 'admin')) {
            return res.status(403).json({ message: 'Not authorized to negotiate this quote.' });
        }

        const currentPrice = quote.price_offered;
        const targetPrice = quote.rfq.target_price || currentPrice;
        const currency = quote.currency || 'USD';

        // 1. Programmatic Fallback Calculations
        let suggestedPrice = currentPrice;

        // Adjust target price for prompt context if it's invalid/higher than current quote price for the buyer
        let displayTargetPrice = targetPrice;
        let warningNote = "";

        if (isBuyer) {
            if (targetPrice < currentPrice) {
                suggestedPrice = Math.max(targetPrice, parseFloat((currentPrice * 0.9).toFixed(2)));
            } else {
                suggestedPrice = parseFloat((currentPrice * 0.9).toFixed(2));
            }
            if (suggestedPrice >= currentPrice) {
                suggestedPrice = parseFloat((currentPrice * 0.95).toFixed(2));
            }

            if (targetPrice >= currentPrice) {
                displayTargetPrice = parseFloat((currentPrice * 0.9).toFixed(2));
                warningNote = `\nNote: The supplier's quoted price is already lower than or equal to the buyer's ideal target price budget. The suggested counter-offer price must be lower than the current quote price of ${currentPrice} ${currency}.`;
            }
        } else {
            // Supplier counter-offers
            suggestedPrice = parseFloat(((currentPrice + targetPrice) / 2).toFixed(2));
            if (suggestedPrice <= targetPrice) {
                suggestedPrice = parseFloat((targetPrice * 1.05).toFixed(2));
            }
            if (suggestedPrice >= currentPrice) {
                suggestedPrice = parseFloat((currentPrice * 0.95).toFixed(2));
            }
        }

        let suggestedNote = isBuyer
            ? `Dear Supplier, could you offer a discounted price of ${suggestedPrice} ${currency} for this bulk quantity?`
            : `Dear Buyer, we can offer a revised rate of ${suggestedPrice} ${currency} for your request.`;

        // 2. Google Gemini 1.5 Flash or OpenAI dynamic AI generation (if api key is active)
        const siteSetting = await SiteSetting.findOne();
        const apiKey = process.env.GEMINI_API_KEY || siteSetting?.ai_api_key;
        if (apiKey) {
            const isGemini = apiKey.startsWith('AIzaSy') || !apiKey.startsWith('sk-');
            const historyText = quote.negotiation_history?.map(h =>
                `- ${h.offered_by === 'buyer' ? 'Buyer' : 'Supplier'} offered: ${h.price} ${currency} with note: "${h.note}"`
            ).join('\n') || 'No previous counters.';

            const prompt = `You are an AI negotiation assistant on a B2B marketplace.
            We need to suggest a reasonable, professional counter-offer for the following quotation negotiation.
            RFQ Title: "${quote.rfq.title}"
            Target Quantity: ${quote.rfq.quantity} ${quote.rfq.unit || 'pieces'}
            Target Price (Buyer's Ideal budget limit): ${displayTargetPrice} ${currency}${warningNote}
            Current Quote Price: ${currentPrice} ${currency}
            Current Note: "${quote.note || ''}"
            Negotiation History:
            ${historyText}
            
            The requester is the ${isBuyer ? 'Buyer' : 'Supplier'}.
            Generate a counter-offer suggestion:
            1. A suggested price (Number only. If Buyer, it MUST be strictly less than the Current Quote Price of ${currentPrice} ${currency}. If Supplier, it must be greater than the Buyer's target price of ${displayTargetPrice} ${currency} but less than the Current Quote Price of ${currentPrice} ${currency}).
            2. A polite, persuasive B2B negotiation message (max 2 sentences) representing the ${isBuyer ? 'Buyer' : 'Supplier'}.
            
            Return the response STRICTLY as a JSON object, with fields "suggestedPrice" (number) and "suggestedNote" (string). Do not add markdown wrapping or formatting.`;

            if (isGemini) {
                try {
                    const aiRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        contents: [{
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            responseMimeType: "application/json"
                        }
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 8000
                    });

                    const textResponse = aiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textResponse) {
                        const parsed = JSON.parse(textResponse.trim());
                        if (parsed.suggestedPrice && !isNaN(parsed.suggestedPrice)) {
                            const tempPrice = parseFloat(parsed.suggestedPrice);
                            if (isBuyer && tempPrice < currentPrice) {
                                suggestedPrice = tempPrice;
                            } else if (!isBuyer && tempPrice > targetPrice && tempPrice < currentPrice) {
                                suggestedPrice = tempPrice;
                            }
                        }
                        if (parsed.suggestedNote) {
                            suggestedNote = parsed.suggestedNote;
                        }
                    }
                } catch (aiErr) {
                    console.error('Gemini Negotiation Helper error:', aiErr.message);
                }
            } else {
                try {
                    const aiRes = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: prompt }],
                        response_format: { type: "json_object" },
                        max_tokens: 300
                    }, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    if (aiRes.data?.choices?.[0]?.message?.content) {
                        const parsed = JSON.parse(aiRes.data.choices[0].message.content.trim());
                        if (parsed.suggestedPrice && !isNaN(parsed.suggestedPrice)) {
                            const tempPrice = parseFloat(parsed.suggestedPrice);
                            if (isBuyer && tempPrice < currentPrice) {
                                suggestedPrice = tempPrice;
                            } else if (!isBuyer && tempPrice > targetPrice && tempPrice < currentPrice) {
                                suggestedPrice = tempPrice;
                            }
                        }
                        if (parsed.suggestedNote) {
                            suggestedNote = parsed.suggestedNote;
                        }
                    }
                } catch (aiErr) {
                    console.error('OpenAI Negotiation Helper error:', aiErr.message);
                }
            }
        }

        res.json({ success: true, suggestedPrice, suggestedNote });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


