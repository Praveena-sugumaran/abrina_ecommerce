const mongoose = require('mongoose');
const ProductQa = require('../models/ProductQa');
const Product = require('../models/Product');

// Get all Q&As for a product
exports.getProductQas = async (req, res) => {
    try {
        const { productId } = req.params;
        let targetProductId = productId;
        
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            const product = await Product.findOne({ slug: productId.toLowerCase() });
            if (!product) {
                return res.json([]); // Return empty if product slug not found
            }
            targetProductId = product._id;
        }

        const qas = await ProductQa.find({ product: targetProductId })
            .populate('customer', 'first_name last_name profile_image')
            .populate('answers.user', 'first_name last_name company_name roles');
        res.json(qas);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create a new question
exports.createQuestion = async (req, res) => {
    try {
        const { productId, question } = req.body;
        if (!productId || !question || !question.trim()) {
            return res.status(400).json({ message: 'Product ID and question text are required.' });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found.' });

        const qa = await ProductQa.create({
            product: productId,
            customer: req.user._id,
            question: question.trim()
        });

        const populated = await ProductQa.findById(qa._id).populate('customer', 'first_name last_name profile_image');
        res.status(201).json(populated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Answer a question
exports.createAnswer = async (req, res) => {
    try {
        const { qaId, answer } = req.body;
        if (!qaId || !answer || !answer.trim()) {
            return res.status(400).json({ message: 'Q&A ID and answer text are required.' });
        }

        const qa = await ProductQa.findById(qaId);
        if (!qa) return res.status(404).json({ message: 'Question not found.' });

        // Push answer
        qa.answers.push({
            user: req.user._id,
            answer: answer.trim()
        });

        await qa.save();

        const populated = await ProductQa.findById(qa._id)
            .populate('customer', 'first_name last_name profile_image')
            .populate('answers.user', 'first_name last_name company_name roles');

        res.json(populated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
