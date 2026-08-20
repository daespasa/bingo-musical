#!/usr/bin/env node
/**
 * Genera las carátulas de la colección de muestra. No se descarga ninguna
 * portada comercial: cada carátula se dibuja aquí, en la paleta de la marca,
 * con el mismo lenguaje de funda de disco que el resto de la aplicación.
 *
 * Es determinista: cada pista de la demo tiene siempre la misma carátula, así
 * que el seed puede volver a ejecutarse sin que cambie ninguna imagen. Se
 * nombran por número, como los fragmentos de audio de la demo.
 *
 * Salida: apps/web/public/covers/demo-01.png … demo-20.png
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { encodePng } from './lib/png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'web', 'public', 'covers');
mkdirSync(outDir, { recursive: true });

const PAPER = [250, 246, 236]; // slate-50, papel hueso
const INK = [26, 22, 19]; // slate-900, tinta
/*
 * Las cinco tintas de la paleta, y ninguna más: la etiqueta del vinilo es lo
 * único que cambia de una carátula a otra, igual que en una colección real.
 */
const LABELS = [
  [207, 58, 0], // brand-600
  [61, 122, 70], // emerald
  [224, 165, 59], // amber
  [179, 64, 42], // accent
  [26, 22, 19], // slate-900
];

/** Tamaño de origen. La casilla del cartón mide 96 px: sobra para pantallas densas. */
const SIZE = 320;

/** Tantas como pistas tiene la colección de muestra. */
const COVERS = 20;

const shade = (color, t) => color.map((v) => Math.round(v + (PAPER[0] - v) * t));

function draw(index) {
  /*
   * La tinta rota una a una y el montaje cada cinco: así un cartón de 5×5 nunca
   * sale con dos carátulas iguales seguidas ni con una sola tinta dominante.
   */
  const label = LABELS[index % LABELS.length];
  const corner = Math.floor(index / LABELS.length) % 4;
  const rgba = Buffer.alloc(SIZE * SIZE * 4);

  const set = (x, y, [r, g, b]) => {
    const i = (y * SIZE + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = 255;
  };

  const cx = corner % 2 === 0 ? SIZE * 0.38 : SIZE * 0.62;
  const cy = corner < 2 ? SIZE * 0.38 : SIZE * 0.62;
  const discR = SIZE * 0.4;
  const labelR = discR * 0.36;
  const holeR = discR * 0.07;
  const border = Math.round(SIZE / 40); // el canto de 2 px del sistema, a esta escala
  const groove = SIZE / 44;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Canto de tinta: la funda tiene borde, como cualquier superficie de Gramola
      if (x < border || y < border || x >= SIZE - border || y >= SIZE - border) {
        set(x, y, INK);
        continue;
      }
      const d = Math.hypot(x - cx, y - cy);
      if (d > discR) {
        set(x, y, PAPER);
      } else if (d <= holeR) {
        set(x, y, PAPER); // el agujero deja ver el papel del fondo
      } else if (d <= labelR) {
        set(x, y, label);
      } else {
        // Surcos: tinta con anillos apenas más claros, nunca un degradado
        const ring = Math.floor((discR - d) / groove) % 2 === 0;
        set(x, y, ring ? INK : shade(INK, 0.07));
      }
    }
  }
  return rgba;
}

for (let i = 0; i < COVERS; i++) {
  const name = `demo-${String(i + 1).padStart(2, '0')}.png`;
  writeFileSync(join(outDir, name), encodePng(draw(i), SIZE));
  console.log(`✓ ${name}`);
}
console.log(`\nCarátulas generadas en ${outDir}`);
