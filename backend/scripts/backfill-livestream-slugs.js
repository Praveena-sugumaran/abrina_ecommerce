require('dotenv').config();
const mongoose = require('mongoose');
const LiveStream = require('../models/LiveStream');

const generateSlug = (title) =>
    title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const streams = await LiveStream.find({});
    console.log(`Found ${streams.length} live streams. Processing...`);

    let updated = 0;
    for (const stream of streams) {
        if (!stream.slug) {
            const baseSlug = generateSlug(stream.title || 'untitled-stream');
            const suffix = stream._id.toString().substring(18);
            const slug = `${baseSlug}-${suffix}`;
            
            await LiveStream.updateOne({ _id: stream._id }, { $set: { slug } });
            console.log(`  ✓ ${stream.title} → ${slug}`);
            updated++;
        }
    }

    console.log(`\n✅ Done! Updated ${updated} live streams.`);
    await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
