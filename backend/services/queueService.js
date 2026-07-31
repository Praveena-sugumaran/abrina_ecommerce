const Job = require('../models/Job');
const { sendMail } = require('./mailService');

/**
 * Add a job to the queue
 */
const addJob = async (type, data) => {
    if (process.env.QUEUE_CONNECTION === 'database') {
        return await Job.create({ type, data });
    } else {
        // Fallback to immediate execution if queue is not enabled
        if (type === 'email') {
            return await sendMail(data);
        }
    }
};

/**
 * Process pending jobs
 */
const processJobs = async () => {
    try {
        const jobs = await Job.find({
            status: { $in: ['pending', 'failed'] },
            attempts: { $lt: 5 },
            processAfter: { $lte: new Date() }
        }).limit(10);

        for (const job of jobs) {
            try {
                job.status = 'processing';
                await job.save();

                if (job.type === 'email') {
                    await sendMail(job.data);
                }

                job.status = 'completed';
                await job.save();
            } catch (error) {
                console.error(`Error processing job ${job._id}:`, error);
                job.status = 'failed';
                job.attempts += 1;
                job.error = error.message;
                // Delay next attempt by 5 minutes
                job.processAfter = new Date(Date.now() + 5 * 60 * 1000);
                await job.save();
            }
        }
    } catch (error) {
        console.error('📦 Queue processing error:', error.message);
    }
};

module.exports = { addJob, processJobs };
