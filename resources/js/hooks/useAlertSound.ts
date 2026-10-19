/**
 * SI-JAGA — useAlertSound.ts
 * Bunyi peringatan untuk PC pos jaga (Web Audio, tanpa file audio).
 * Browser baru mengizinkan bunyi setelah ada interaksi pengguna, jadi
 * operator menyalakannya lewat tombol di topbar; pilihannya diingat.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'sijaga_sound_enabled';

export type AlertKind = 'warning' | 'alarm';

// [frekuensi Hz, mulai detik, lama detik]
const PATTERNS: Record<AlertKind, Array<[number, number, number]>> = {
  warning: [[880, 0, 0.15], [880, 0.25, 0.15]],
  alarm: [[880, 0, 0.2], [660, 0.25, 0.2], [880, 0.5, 0.2], [660, 0.75, 0.2], [880, 1, 0.2], [660, 1.25, 0.2]],
};

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function useAlertSound() {
  const [enabled, setEnabled] = useState(readEnabled);
  const enabledRef = useRef(enabled);
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playPattern = useCallback((kind: AlertKind) => {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const [freq, start, duration] of PATTERNS[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    }
  }, [getContext]);

  const play = useCallback((kind: AlertKind) => {
    if (enabledRef.current) playPattern(kind);
  }, [playPattern]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Penyimpanan diblokir: pilihan tetap berlaku selama halaman terbuka.
    }
    if (next) playPattern('warning');
  }, [playPattern]);

  // Setelah halaman dibuka ulang, bunyi baru boleh jalan sesudah interaksi
  // pertama; aktifkan konteks audionya begitu itu terjadi.
  useEffect(() => {
    if (!enabled) return;
    const unlock = () => { getContext(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [enabled, getContext]);

  return { enabled, toggle, play };
}
