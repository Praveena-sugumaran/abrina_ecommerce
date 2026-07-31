const EmailTemplate = require('../../models/EmailTemplate');

exports.getAllTemplates = async (req, res) => {
    try {
        const templates = await EmailTemplate.find().sort({ createdAt: -1 });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTemplateById = async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json(template);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const { name, slug, subject, body, placeholders, status, description } = req.body;
        
        const existingTemplate = await EmailTemplate.findOne({ $or: [{ name }, { slug }] });
        if (existingTemplate) {
            return res.status(400).json({ message: 'Template with this name or slug already exists' });
        }

        const template = new EmailTemplate({
            name,
            slug,
            subject,
            body,
            placeholders,
            status,
            description
        });

        await template.save();
        res.status(201).json(template);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const { name, slug, subject, body, placeholders, status, description } = req.body;
        
        const template = await EmailTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        template.name = name || template.name;
        template.slug = slug || template.slug;
        template.subject = subject || template.subject;
        template.body = body || template.body;
        template.placeholders = placeholders || template.placeholders;
        template.status = status || template.status;
        template.description = description || template.description;

        await template.save();
        res.json(template);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const template = await EmailTemplate.findByIdAndDelete(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
