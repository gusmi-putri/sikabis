/**
 * SI-JAGA — ReliableImage.tsx
 * <img> yang mencoba ulang otomatis kalau pemuatan gagal. Foto baru sering
 * diminta browser saat koneksinya sedang penuh oleh polling API; tanpa
 * retry, <img> yang gagal sekali tetap kosong sampai halaman di-refresh.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';

const RETRY_DELAYS_MS = [500, 1000, 2000, 3000, 5000, 8000];

interface ReliableImageProps {
  src: string;
  alt: string;
  className?: string;
}

interface LoadState {
  src: string;
  attempt: number;
  gaveUp: boolean;
}

export const ReliableImage: React.FC<ReliableImageProps> = ({ src, alt, className }) => {
  const [state, setState] = useState<LoadState>({ src, attempt: 0, gaveUp: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Foto berganti (misal baris tabel dipakai ulang): mulai dari awal.
  if (state.src !== src) {
    setState({ src, attempt: 0, gaveUp: false });
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleError = () => {
    if (state.attempt >= RETRY_DELAYS_MS.length) {
      setState((s) => ({ ...s, gaveUp: true }));
      return;
    }
    const delay = RETRY_DELAYS_MS[state.attempt];
    timerRef.current = setTimeout(() => {
      setState((s) => ({ ...s, attempt: s.attempt + 1 }));
    }, delay);
  };

  if (state.gaveUp) {
    return (
      <div className={`${className ?? ''} flex items-center justify-center bg-white/5 text-slate-500`}>
        <ImageOff className="w-4 h-4" />
      </div>
    );
  }

  // Parameter r= memaksa browser membuat permintaan baru, bukan memakai
  // hasil gagal yang sempat tersimpan.
  const url = state.attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}r=${state.attempt}`;

  return <img key={state.attempt} src={url} alt={alt} className={className} onError={handleError} />;
};
