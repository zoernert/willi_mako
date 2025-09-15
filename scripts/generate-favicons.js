#!/usr/bin/env node
// Generate favicon and app icons from public/media/logo.png (800x200)
// Requires sharp (already in dependencies)

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true }).catch(() => {});
}

async function generate() {
  const root = process.cwd();
  const src = path.join(root, 'public', 'media', 'logo.png');
  const out = path.join(root, 'public');

  if (!fs.existsSync(src)) {
    console.error('Source logo not found at', src);
    process.exit(1);
  }

  await ensureDir(out);

  // Prepare a square base (transparent background, contain fit)
  const baseSize = 1024;
  const basePng = await sharp(src)
    .resize(baseSize, baseSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // PNG favicons
  const pngTargets = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];

  await Promise.all(
    pngTargets.map(({ name, size }) =>
      sharp(basePng)
        .resize(size, size)
        .png({ compressionLevel: 9 })
        .toFile(path.join(out, name))
    )
  );

  // Note: We skip generating a .ico to avoid extra dependencies.
  // Modern browsers support PNG favicons via link rel tags.

  // Minimal web manifest
  const manifest = {
    name: 'Willi-Mako',
    short_name: 'Willi-Mako',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: '#147a50',
    background_color: '#ffffff',
    display: 'standalone'
  };
  await fs.promises.writeFile(path.join(out, 'site.webmanifest'), JSON.stringify(manifest, null, 2));

  console.log('Favicons generated in /public');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
