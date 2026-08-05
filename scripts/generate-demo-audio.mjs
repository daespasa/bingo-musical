#!/usr/bin/env node
/**
 * Genera 20 pistas demo (WAV, ~17 s) con melodías sintetizadas propias.
 * Sin dependencias externas y sin material con copyright.
 * Salida: apps/web/public/audio/demo-01.wav ... demo-20.wav
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'web', 'public', 'audio');
mkdirSync(outDir, { recursive: true });

const SAMPLE_RATE = 22050;
const DURATION_S = 17;

// PRNG determinista (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SCALES = [
  [0, 2, 4, 5, 7, 9, 11], // mayor
  [0, 2, 3, 5, 7, 8, 10], // menor
  [0, 2, 4, 7, 9], // pentatónica mayor
  [0, 3, 5, 7, 10], // pentatónica menor
  [0, 2, 3, 5, 7, 9, 10], // dórica
];

function synthesize(index) {
  const random = rng(1000 + index * 7919);
  const scale = SCALES[index % SCALES.length];
  const rootHz = 220 * Math.pow(2, (index % 12) / 12);
  const bpm = 90 + Math.floor(random() * 70);
  const noteDur = 60 / bpm / 2; // corcheas
  const total = SAMPLE_RATE * DURATION_S;
  const samples = new Float64Array(total);

  // Secuencia de notas
  const seq = [];
  let t = 0;
  while (t < DURATION_S) {
    const deg = scale[Math.floor(random() * scale.length)];
    const octave = random() < 0.2 ? 2 : 1;
    const freq = rootHz * Math.pow(2, deg / 12) * octave;
    const dur = noteDur * (random() < 0.25 ? 2 : 1);
    seq.push({ start: t, dur, freq });
    t += dur;
  }

  for (const { start, dur, freq } of seq) {
    const s0 = Math.floor(start * SAMPLE_RATE);
    const n = Math.floor(dur * SAMPLE_RATE);
    for (let i = 0; i < n && s0 + i < total; i++) {
      const tt = i / SAMPLE_RATE;
      const env = Math.min(1, tt / 0.02) * Math.exp(-2.5 * tt);
      const wave =
        Math.sin(2 * Math.PI * freq * tt) * 0.6 +
        Math.sin(2 * Math.PI * freq * 2 * tt) * 0.25 +
        Math.sin(2 * Math.PI * freq * 3 * tt) * 0.1;
      samples[s0 + i] += wave * env * 0.5;
    }
  }

  // Pulso rítmico grave
  const beatDur = 60 / bpm;
  for (let b = 0; b * beatDur < DURATION_S; b++) {
    const s0 = Math.floor(b * beatDur * SAMPLE_RATE);
    for (let i = 0; i < SAMPLE_RATE * 0.09 && s0 + i < total; i++) {
      const tt = i / SAMPLE_RATE;
      samples[s0 + i] += Math.sin(2 * Math.PI * 60 * tt) * Math.exp(-30 * tt) * 0.4;
    }
  }

  // Fade out final
  const fade = SAMPLE_RATE * 1.5;
  for (let i = 0; i < fade; i++) {
    samples[total - 1 - i] *= i / fade;
  }

  // Normalizar y convertir a PCM16
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.85 / peak : 1;
  const pcm = Buffer.alloc(total * 2);
  for (let i = 0; i < total; i++) {
    pcm.writeInt16LE(Math.round(samples[i] * gain * 32767), i * 2);
  }
  return pcm;
}

function wavFile(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

for (let i = 1; i <= 20; i++) {
  const name = `demo-${String(i).padStart(2, '0')}.wav`;
  writeFileSync(join(outDir, name), wavFile(synthesize(i)));
  process.stdout.write(`✓ ${name}\n`);
}
console.log(`\n20 pistas demo generadas en ${outDir}`);
