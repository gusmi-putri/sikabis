/**
 * SI-JAGA — useEscapeKey.ts
 * Menjalankan onEscape saat tombol Esc ditekan, selama `active` true.
 * Dipakai modal supaya bisa ditutup dari keyboard.
 */

import { useEffect } from 'react';

export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onEscape]);
}
