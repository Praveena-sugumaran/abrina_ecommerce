const fs = require('fs');
const path = require('path');

exports.getEmailSettings = (req, res) => {
    try {
        const envPath = path.resolve(__dirname, '../../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const settings = {
            MAIL_MAILER: '',
            MAIL_HOST: '',
            MAIL_PORT: '',
            MAIL_USERNAME: '',
            MAIL_PASSWORD: '',
            MAIL_ENCRYPTION: '',
            MAIL_FROM_ADDRESS: '',
            MAIL_FROM_NAME: ''
        };

        envContent.split(/\r?\n/).forEach(line => {
            if (line && line.includes('=')) {
                // To safely handle the first '=', avoiding splitting the value if it has '='
                const index = line.indexOf('=');
                const key = line.substring(0, index).trim();
                let value = line.substring(index + 1).trim();
                
                // Remove surrounding quotes if they exist
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                }

                if (Object.prototype.hasOwnProperty.call(settings, key)) {
                    settings[key] = value;
                }
            }
        });

        res.json(settings);
    } catch (err) {
        console.error('Failed to read email settings:', err);
        res.status(500).json({ message: 'Failed to read environment configurations.' });
    }
};

exports.updateEmailSettings = (req, res) => {
    try {
        const payload = req.body;
        const envPath = path.resolve(__dirname, '../../.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        let lines = envContent.split(/\r?\n/);

        const keysToUpdate = [
            'MAIL_MAILER', 'MAIL_HOST', 'MAIL_PORT', 
            'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_ENCRYPTION', 
            'MAIL_FROM_ADDRESS', 'MAIL_FROM_NAME'
        ];

        keysToUpdate.forEach(key => {
            if (payload[key] !== undefined) {
                // Need to encode quotes for from_name if there's spaces
                let value = payload[key];
                if (key === 'MAIL_FROM_NAME' && value.includes(' ')) {
                    value = `"${value}"`;
                }
                
                const regex = new RegExp(`^${key}=.*`, 'm');
                if (regex.test(envContent)) {
                    // Update existing
                    envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                    // Append if not found
                    envContent += `\n${key}=${value}`;
                }
            }
        });

        fs.writeFileSync(envPath, envContent, 'utf8');

        // Manually update process.env and reset transporter
        const { resetTransporter } = require('../../services/mailService');
        keysToUpdate.forEach(key => {
            if (payload[key] !== undefined) {
                process.env[key] = payload[key];
            }
        });
        resetTransporter();

        res.json({ message: 'Email settings updated successfully and applied.' });
    } catch (err) {
        console.error('Failed to update email settings:', err);
        res.status(500).json({ message: 'Failed to write environment configurations.' });
    }
};

exports.sendTestEmail = async (req, res) => {
    try {
        const { recipient_email } = req.body;
        if (!recipient_email) {
            return res.status(400).json({ message: 'Recipient email address is required.' });
        }

        const { getTransporter } = require('../../services/mailService');
        const fromName = process.env.MAIL_FROM_NAME || 'Platform Admin';
        const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME;

        await getTransporter().sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to: recipient_email,
            subject: 'SMTP Configuration Test Mail',
            text: 'Congratulations! Your SMTP email configuration is working successfully.',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #0f172a; margin-top: 0;">🎉 SMTP Test Mail Successful</h2>
                    <p style="color: #475569; font-size: 14px;">Your platform email server configuration is working properly.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="color: #94a3b8; font-size: 12px;">Sent from ${fromName} at ${new Date().toLocaleString()}</p>
                </div>
            `
        });

        res.json({ success: true, message: `Test email sent successfully to ${recipient_email}` });
    } catch (err) {
        console.error('Failed to send test email:', err);
        res.status(500).json({ success: false, message: err.message || 'Failed to send test email. Check your SMTP host, credentials, and port.' });
    }
};
