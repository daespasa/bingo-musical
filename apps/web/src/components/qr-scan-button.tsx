'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QrCode, X } from 'lucide-react';
import { extractRoomCode } from '@bingo/shared';

/**
 * Detector de códigos de barras del navegador. No está en las definiciones
 * del DOM todavía y solo lo traen los navegadores basados en Chromium, así
 * que se declara aquí y el botón se oculta donde no exista.
 */
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getDetectorConstructor(): BarcodeDetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  return ctor ?? null;
}

/**
 * Escanea el QR de la sala con la cámara trasera. Es un atajo, nunca la única
 * vía: el código siempre se puede teclear, así que si el navegador no lo
 * admite o se deniega la cámara, el botón desaparece o lo explica.
 */
export function QrScanButton({ onCode }: { onCode: (code: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(
      getDetectorConstructor() !== null && Boolean(navigator.mediaDevices?.getUserMedia),
    );
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setOpen(false);
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!open) return;
    const Detector = getDetectorConstructor();
    if (!Detector) return;

    let cancelled = false;
    let frame = 0;
    const detector = new Detector({ formats: ['qr_code'] });

    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            for (const found of codes) {
              const code = extractRoomCode(found.rawValue);
              if (code) {
                cancelled = true;
                stop();
                onCode(code);
                return;
              }
            }
          } catch {
            // Un fotograma ilegible no es un fallo: se prueba con el siguiente
          }
          frame = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        if (!cancelled) {
          setError('No se pudo abrir la cámara. Escribe el código a mano.');
          stop();
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, onCode, stop]);

  if (!supported) return null;

  return (
    <div className="mt-4">
      {!open && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="mx-auto flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-slate-500 underline-offset-4 hover:text-brand-600 hover:underline dark:text-slate-400"
        >
          <QrCode className="h-4 w-4" aria-hidden />
          Escanear código QR
        </button>
      )}

      {open && (
        <div className="rounded border-2 border-slate-900 bg-slate-950 p-2 dark:border-slate-100">
          <video
            ref={videoRef}
            className="aspect-square w-full rounded object-cover"
            muted
            playsInline
            aria-label="Cámara para escanear el código QR"
          />
          <button
            type="button"
            onClick={stop}
            className="mt-2 flex w-full items-center justify-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-slate-100"
          >
            <X className="h-4 w-4" aria-hidden />
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-accent-500">
          {error}
        </p>
      )}
    </div>
  );
}
