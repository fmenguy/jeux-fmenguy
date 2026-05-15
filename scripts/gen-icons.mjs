/**
 * Genere les PNGs PWA depuis le SVG source.
 * Usage : node scripts/gen-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public/icons/aelindra-icon.svg');
const svg = readFileSync(svgPath);

const targets = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  // Maskable : zone de securite, marge interieure ~20%
  { size: 512, name: 'icon-512-maskable.png', maskable: true },
  // Apple touch
  { size: 180, name: 'apple-touch-icon.png' },
];

for (const t of targets) {
  const outPath = resolve(root, 'public/icons', t.name);
  let pipeline = sharp(svg, { density: 300 });
  if (t.maskable) {
    // Pour maskable : zone safe interieure, on ajoute une marge en redimensionnant le SVG plus petit dans un canvas plein
    const inner = Math.round(t.size * 0.7);
    pipeline = sharp({
      create: {
        width: t.size,
        height: t.size,
        channels: 4,
        background: { r: 7, g: 9, b: 14, alpha: 1 },
      },
    }).composite([
      {
        input: await sharp(svg, { density: 300 }).resize(inner, inner).png().toBuffer(),
        gravity: 'center',
      },
    ]);
  } else {
    pipeline = pipeline.resize(t.size, t.size);
  }
  await pipeline.png().toFile(outPath);
  console.log(`OK ${t.name} (${t.size}x${t.size}${t.maskable ? ' maskable' : ''})`);
}
