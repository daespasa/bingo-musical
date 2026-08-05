#!/usr/bin/env node
/**
 * Genera los iconos PNG de la PWA sin dependencias externas: dibuja el
 * cartón de bingo musical en un búfer RGBA y lo codifica como PNG con
 * el zlib de Node.
 *
 * Salida: apps/web/public/icons/icon-{192,512}.png y maskable-512.png
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'web', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BRAND = [147, 51, 234]; // brand-600
const ACCENT = [244, 63, 94]; // accent-500
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Codifica un búfer RGBA (size × size) como PNG. */
function encodePng(rgba, size) {
  const stride = size * 4;
  // Cada fila lleva delante su byte de filtro (0 = None)
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profundidad de bit
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function draw(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4);
  // El icono maskable reserva un 10 % de margen por lado (safe zone)
  const pad = maskable ? size * 0.1 : size * 0.06;
  const inner = size - pad * 2;
  const radius = maskable ? size / 2 : inner * 0.22;

  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = a;
  };

  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside;
      if (maskable) {
        inside = Math.hypot(x - cx, y - cy) <= radius;
      } else {
        // Rectángulo redondeado
        const dx = Math.max(pad + radius - x, 0, x - (size - pad - radius));
        const dy = Math.max(pad + radius - y, 0, y - (size - pad - radius));
        inside =
          x >= pad &&
          x <= size - pad &&
          y >= pad &&
          y <= size - pad &&
          Math.hypot(dx, dy) <= radius;
      }
      if (!inside) continue;
      // Degradado diagonal marca → acento
      const t = (x / size) * 0.5 + (y / size) * 0.5;
      set(x, y, mix(BRAND, ACCENT, t));
    }
  }

  // Rejilla 3×3 de casillas: dos marcadas (círculo relleno) y el resto huecas
  const gridSize = inner * 0.58;
  const cell = gridSize / 3;
  // Desplazamos la rejilla a la izquierda para dejar sitio a la nota musical
  const gx = cx - gridSize / 2 - inner * 0.1;
  const gy = cy - gridSize / 2;
  const marked = new Set([0, 4, 8]);
  const dotR = cell * 0.26;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const ccx = gx + cell * col + cell / 2;
      const ccy = gy + cell * row + cell / 2;
      const isMarked = marked.has(row * 3 + col);
      for (let y = Math.floor(ccy - dotR - 2); y <= Math.ceil(ccy + dotR + 2); y++) {
        for (let x = Math.floor(ccx - dotR - 2); x <= Math.ceil(ccx + dotR + 2); x++) {
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const d = Math.hypot(x - ccx, y - ccy);
          if (isMarked ? d <= dotR : d <= dotR && d >= dotR - Math.max(1.5, size / 96)) {
            set(x, y, WHITE);
          }
        }
      }
    }
  }

  // Corchea sobre la rejilla: plica vertical + cabeza redonda
  const stemX = Math.round(cx + gridSize * 0.62);
  const stemTop = Math.round(cy - gridSize * 0.55);
  const stemBottom = Math.round(cy + gridSize * 0.3);
  const stemW = Math.max(2, Math.round(size / 48));
  for (let y = stemTop; y <= stemBottom; y++) {
    for (let x = stemX; x < stemX + stemW; x++) {
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, WHITE);
    }
  }
  const headR = Math.max(3, size * 0.055);
  for (let y = Math.floor(stemBottom - headR); y <= Math.ceil(stemBottom + headR); y++) {
    for (let x = Math.floor(stemX - headR * 1.6); x <= Math.ceil(stemX + headR); x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const dx = (x - (stemX - headR * 0.3)) / (headR * 1.15);
      const dy = (y - stemBottom) / headR;
      if (dx * dx + dy * dy <= 1) set(x, y, WHITE);
    }
  }
  // Banderola de la corchea
  const flagH = Math.max(3, size * 0.05);
  for (let y = stemTop; y < stemTop + flagH * 2; y++) {
    const progress = (y - stemTop) / (flagH * 2);
    const width = Math.round(size * 0.09 * (1 - progress * 0.4));
    for (let x = stemX + stemW; x < stemX + stemW + width; x++) {
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, WHITE);
    }
  }

  return rgba;
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const { name, size, maskable } of targets) {
  writeFileSync(join(outDir, name), encodePng(draw(size, { maskable }), size));
  process.stdout.write(`✓ ${name} (${size}×${size})\n`);
}
console.log(`\nIconos generados en ${outDir}`);
