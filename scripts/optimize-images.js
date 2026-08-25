#!/usr/bin/env node
/**
 * Converts already-uploaded product photos to WebP and rewrites the paths
 * stored in the products table.
 *
 *   node scripts/optimize-images.js --dry    # report only, change nothing
 *   node scripts/optimize-images.js          # convert
 *
 * Originals are kept until you confirm the result, then removed with --clean.
 */
require('dotenv').config();
const path  = require('path');
const fs    = require('fs');
const sharp = require('sharp');
const db    = require('../db');

const DATA_DIR   = process.env.DATA_DIR || '';
const uploadsDir = DATA_DIR
  ? path.join(DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'public', 'uploads');

const MAX_SIDE = 1400;
const QUALITY  = 82;

const DRY   = process.argv.includes('--dry');
const CLEAN = process.argv.includes('--clean');

const kb = n => (n / 1024).toFixed(0) + ' KB';

(async () => {
  if (CLEAN) {
    const rows = db.prepare('SELECT images FROM products').all();
    const used = new Set(rows.flatMap(r => JSON.parse(r.images || '[]')).map(p => path.basename(p)));
    let removed = 0, freed = 0;
    for (const f of fs.readdirSync(uploadsDir)) {
      if (f === '.gitkeep' || used.has(f)) continue;
      const fp = path.join(uploadsDir, f);
      freed += fs.statSync(fp).size;
      fs.unlinkSync(fp);
      removed++;
    }
    console.log(`Removed ${removed} unreferenced file(s), freed ${kb(freed)}`);
    return;
  }

  const products = db.prepare('SELECT id, name, images FROM products').all();
  let before = 0, after = 0, converted = 0, skipped = 0;

  for (const p of products) {
    const imgs = JSON.parse(p.images || '[]');
    const next = [];
    let changed = false;

    for (const img of imgs) {
      const base = path.basename(img);
      const src  = path.join(uploadsDir, base);

      if (!fs.existsSync(src)) {
        console.log(`  ! missing, kept as-is: ${base}`);
        next.push(img);
        continue;
      }
      if (base.toLowerCase().endsWith('.webp')) {
        next.push(img);
        skipped++;
        continue;
      }

      const srcSize = fs.statSync(src).size;
      const outName = base.replace(/\.[^.]+$/, '') + '.webp';
      const outPath = path.join(uploadsDir, outName);

      if (DRY) {
        const meta = await sharp(src).metadata();
        console.log(`  ${base} (${kb(srcSize)}, ${meta.width}x${meta.height}) -> ${outName}`);
        before += srcSize;
        next.push(img);
        converted++;
        continue;
      }

      await sharp(src)
        .rotate()
        .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(outPath);

      const outSize = fs.statSync(outPath).size;
      before += srcSize;
      after  += outSize;
      converted++;
      changed = true;
      next.push(`/uploads/${outName}`);
      console.log(`  ${base} ${kb(srcSize)} -> ${outName} ${kb(outSize)}  (-${Math.round((1 - outSize / srcSize) * 100)}%)`);
    }

    if (changed && !DRY) {
      db.prepare('UPDATE products SET images=? WHERE id=?').run(JSON.stringify(next), p.id);
      console.log(`  updated product #${p.id} "${p.name}"`);
    }
  }

  console.log('');
  if (DRY) {
    console.log(`DRY RUN — ${converted} file(s) would be converted, ${skipped} already WebP.`);
    console.log(`Current size: ${kb(before)}. Run without --dry to convert.`);
  } else {
    console.log(`Converted ${converted}, skipped ${skipped} (already WebP).`);
    if (converted) {
      console.log(`${kb(before)} -> ${kb(after)}  (-${Math.round((1 - after / before) * 100)}%)`);
      console.log(`Originals kept. Check the shop, then run with --clean to delete them.`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
