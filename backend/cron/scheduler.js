const dummyDataService = require('../services/dummyDataService');
const { sendMail } = require('../services/mailService');
const { checkLicense } = require('../services/licenseService');

/**
 * Starts the daily automated demo data reset scheduler.
 * Runs checks at the top of every minute.
 */
const startCronScheduler = () => {
    console.log('⏰ Daily Demo Reset Cron Scheduler successfully initialized.');

    // Check every minute
    setInterval(async () => {
        const now = new Date();

        // Target: 2:00 AM daily (local server time)
        if (now.getHours() === 2 && now.getMinutes() === 0) {
            try {
                const SiteSetting = require('../models/SiteSetting');
                const settings = await SiteSetting.findOne();
                if (settings && settings.enable_cron_reset === false) {
                    console.log('⏰ scheduled event: Daily automated reset bypassed (enable_cron_reset is set to false).');
                    return;
                }
            } catch (checkErr) {
                console.error('⚠️ Failed to check SiteSetting for enable_cron_reset, continuing reset anyway:', checkErr);
            }

            console.log('⏰ scheduled event: 2:00 AM reached. Initiating automated demo reset and import...');

            try {
                // The service importDummyData triggers cleanup under the hood
                const logSession = await dummyDataService.importDummyData(null, 'cron');
                console.log(`⏰ Automated Demo Reset executed successfully. Duration: ${logSession.durationMs}ms`);
            } catch (err) {
                console.error('❌ Automated Demo Reset Failed:', err);

                // Dispatch notification email to administrator
                try {
                    const adminEmail = process.env.MAIL_FROM_ADDRESS || 'admin@gmail.com';
                    await sendMail({
                        to: adminEmail,
                        subject: '🚨 CRITICAL FAILURE: Automated Demo Reset Failed 🚨',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 2px solid #ef4444; border-radius: 12px; background-color: #fef2f2;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <span style="font-size: 40px;">🚨</span>
                                    <h2 style="color: #dc2626; margin: 10px 0 0 0; font-size: 22px;">System Automated Reset Failed</h2>
                                </div>
                                <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #fee2e2; margin-bottom: 20px;">
                                    <p style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">Operational Details:</p>
                                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                        <tr>
                                            <td style="padding: 6px 0; color: #4b5563;">Action:</td>
                                            <td style="padding: 6px 0; font-weight: 600; color: #111827;">CLEANUP & RESTORE</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: #4b5563;">Scheduled Time:</td>
                                            <td style="padding: 6px 0; font-weight: 600; color: #111827;">02:00 AM Daily</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: #4b5563;">Failure Time:</td>
                                            <td style="padding: 6px 0; font-weight: 600; color: #111827;">${now.toLocaleString()}</td>
                                        </tr>
                                    </table>
                                </div>
                                <div style="background-color: #7f1d1d; color: #fee2e2; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px; line-height: 1.5; white-space: pre-wrap; overflow-x: auto; margin-bottom: 20px;">
<strong>Error Stack:</strong>
${err.stack || err.message}
                                </div>
                                <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">
                                    Please log into the Super Admin panel immediately to view full transaction logs, resolve any database lock constraints, and trigger a manual reset.
                                </p>
                                <hr style="border: 0; border-top: 1px solid #fee2e2; margin: 24px 0;" />
                                <div style="text-align: center; color: #9ca3af; font-size: 12px;">
                                    This is an automated operational alert generated by your Next.js B2B platform.
                                </div>
                            </div>
                        `
                    });
                    console.log('📧 Success: Failure notification email dispatched to admin.');
                } catch (emailErr) {
                    console.error('❌ Critical: Failed to dispatch failure email notification:', emailErr);
                }
            }
        }
    }, 60000); // Check once per minute
};

/**
 * Starts the 6-hour license verification heartbeat task
 */
const startLicenseHeartbeat = () => {
    console.log('⏰ Licensing Heartbeat scheduler initialized (runs every 6 hours).');
    
    const getVerificationHost = () => {
        let host = 'localhost';
        if (process.env.FRONTEND_URL) {
            try {
                host = new URL(process.env.FRONTEND_URL).hostname;
            } catch (err) {
                host = process.env.FRONTEND_URL.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split(':')[0].trim();
            }
        }
        return host;
    };

    // Check shortly after boot
    setTimeout(async () => {
        try {
            const host = getVerificationHost();
            const result = await checkLicense(host);
            console.log(`ℹ️ Licensing heartbeat check result on boot (${host}):`, result);
        } catch (err) {
            console.error('❌ Licensing heartbeat check failed on boot:', err.message);
        }
    }, 5000);

    // Heartbeat every 6 hours
    setInterval(async () => {
        try {
            console.log('⏰ scheduled event: Executing 6-hour license validation check...');
            const host = getVerificationHost();
            const result = await checkLicense(host);
            console.log(`⏰ Licensing check outcome (${host}):`, result);
        } catch (err) {
            console.error('❌ Licensing check failed:', err.message);
        }
    }, 6 * 60 * 60 * 1000);
};

module.exports = {
    startCronScheduler,
    startLicenseHeartbeat
};
