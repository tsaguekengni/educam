// ============================================================
// EduCam — lesson media uploader
// Usage:   node upload-lesson.mjs <folder>
// Example: node upload-lesson.mjs nc-u1-l1
//
// It will:
//   1. Upload every media file inside <folder> to the
//      Supabase "lesson-images" bucket, under <folder>/<filename>.
//   2. Print each file's public URL.
//   3. If <folder> contains a template .sql file (anything ending
//      in .sql but NOT .filled.sql), replace every [[<folder>/<file>]]
//      token with the real public URL and write <name>.filled.sql.
//
// Your service-role key is read from an environment variable and is
// NEVER stored in this file. See the run instructions.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, extname } from 'path';

// --- config (project ref is public, safe to hard-code) ----------------------
const SUPABASE_URL = 'https://brrutnxaizdllthgcnqm.supabase.co';
const BUCKET = 'lesson-images';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- content types by extension --------------------------------------------
const CONTENT_TYPES = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

// --- checks -----------------------------------------------------------------
const folder = process.argv[2];
if (!folder) fail('Give a folder name, e.g.  node upload-lesson.mjs nc-u1-l1');
if (!SERVICE_ROLE_KEY) {
  fail(
    'SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
    '   PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"\n' +
    '   cmd.exe:     set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n' +
    '   then run this script again in the SAME window.'
  );
}
try {
  if (!statSync(folder).isDirectory()) fail(`"${folder}" is not a folder.`);
} catch {
  fail(`Folder "${folder}" not found. Create it next to this script and put the lesson files inside.`);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --- classify files ---------------------------------------------------------
const entries = readdirSync(folder).filter((n) => !n.startsWith('.'));
const mediaFiles = entries.filter((n) => extname(n).toLowerCase() !== '.sql');
const templateSql = entries.find(
  (n) => n.toLowerCase().endsWith('.sql') && !n.toLowerCase().endsWith('.filled.sql')
);

if (mediaFiles.length === 0) fail(`No media files found in "${folder}".`);

// --- upload -----------------------------------------------------------------
console.log(`\n📤 Uploading ${mediaFiles.length} file(s) from "${folder}" to bucket "${BUCKET}"...\n`);

const urlMap = {}; // "folder/filename" -> publicUrl
let hadError = false;

for (const name of mediaFiles) {
  const localPath = join(folder, name);
  const objectPath = `${folder}/${name}`;
  const contentType = CONTENT_TYPES[extname(name).toLowerCase()] || 'application/octet-stream';

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, readFileSync(localPath), { contentType, upsert: true });

  if (error) {
    hadError = true;
    console.log(`  ❌ ${name}  —  ${error.message}`);
    continue;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  urlMap[objectPath] = data.publicUrl;
  console.log(`  ✅ ${name}`);
  console.log(`     ${data.publicUrl}`);
}

// --- fill the SQL template --------------------------------------------------
if (templateSql) {
  const templatePath = join(folder, templateSql);
  let sql = readFileSync(templatePath, 'utf8');

  const missing = [];
  // Replace every [[folder/filename]] token with its URL.
  sql = sql.replace(/\[\[([^\]]+)\]\]/g, (whole, token) => {
    if (urlMap[token]) return urlMap[token];
    missing.push(token);
    return whole; // leave untouched so it's easy to spot
  });

  const outName = templateSql.replace(/\.sql$/i, '.filled.sql');
  const outPath = join(folder, outName);
  writeFileSync(outPath, sql, 'utf8');

  console.log(`\n📝 Wrote ${outPath}`);
  if (missing.length) {
    console.log(`   ⚠️  These tokens had no matching uploaded file (still placeholders):`);
    [...new Set(missing)].forEach((t) => console.log(`      [[${t}]]`));
  } else {
    console.log(`   All tokens filled. Paste this file into the Supabase SQL editor and run it.`);
  }
} else {
  console.log(`\nℹ️  No .sql template in "${folder}" — printed URLs only.`);
}

console.log(hadError ? '\nFinished with some errors ⚠️\n' : '\nDone ✅\n');
