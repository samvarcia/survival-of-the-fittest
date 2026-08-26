import { UTApi, UTFile } from 'uploadthing/server';
import fs from 'fs';
import path from 'path';

const token = process.env.UPLOADTHING_TOKEN?.trim().replace(/^['"]|['"]$/g, '');
if (!token) {
  console.error('Missing UPLOADTHING_TOKEN');
  process.exit(1);
}

const srcDir = path.join(process.env.HOME, 'Downloads/sotfImages-web');
const files = fs.readdirSync(srcDir)
  .filter((f) => f.toLowerCase().endsWith('.jpg'))
  .sort();

console.log(`Found ${files.length} files in ${srcDir}`);

const utapi = new UTApi({ token });
const results = [];

const batchSize = 5;
for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  const utFiles = batch.map((name) => {
    const buf = fs.readFileSync(path.join(srcDir, name));
    return new UTFile([buf], name, { type: 'image/jpeg' });
  });

  console.log(`Uploading batch ${i / batchSize + 1}: ${batch.join(', ')}`);
  const response = await utapi.uploadFiles(utFiles);

  response.forEach((entry, idx) => {
    if (entry.error) {
      console.error(`FAIL ${batch[idx]}:`, entry.error);
      results.push({ name: batch[idx], error: String(entry.error?.message || entry.error) });
    } else {
      const data = entry.data;
      console.log(`OK ${batch[idx]} → ${data.ufsUrl || data.url}`);
      results.push({
        name: batch[idx],
        url: data.ufsUrl || data.url,
        key: data.key,
      });
    }
  });
}

const outPath = path.join(process.cwd(), 'sotf-upload-results.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`Wrote ${outPath}`);
const ok = results.filter((r) => r.url).length;
console.log(`Done: ${ok}/${results.length} uploaded`);
