const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const files = fs.readdirSync(localesDir)
    .filter(f => f.endsWith('.tsx'))
    .map(f => path.join(localesDir, f));

files.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        return;
    }

    console.log(`Processing file: ${file}`);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    const seenKeys = new Set();
    const outputLines = [];

    // Simple parser to extract key and deduplicate
    for (let line of lines) {
        // Match key: "value", or 'key': "value", or 'key': 'value', etc.
        const match = line.match(/^\s*['"]?([a-zA-Z0-9_]+)['"]?\s*:/);
        if (match) {
            const key = match[1];
            if (seenKeys.has(key)) {
                // Duplicate key! Skip this line.
                console.log(`  Removing duplicate key: ${key}`);
                continue;
            }
            seenKeys.add(key);
        }
        outputLines.push(line);
    }

    fs.writeFileSync(file, outputLines.join('\n'), 'utf8');
    console.log(`Finished deduplicating: ${file}`);
});
