import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  dying: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;
const DURATION = 4000;
const FADE_DURATION = 300;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    // Mark as dying (fade out)
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dying: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, FADE_DURATION);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++nextId;
      setToasts((prev) => [...prev.slice(-4), { id, message, type, dying: false }]);
      const timer = setTimeout(() => dismiss(id), DURATION);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const t = timers.current;
    return () => { t.forEach(clearTimeout); };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const CONFIGS: Record<ToastType, { Icon: React.ElementType; bg: string; border: string; iconColor: string }> = {
  success: { Icon: CheckCircle2, bg: 'bg-slate-900',  border: 'border-emerald-500/50', iconColor: 'text-emerald-400' },
  error:   { Icon: XCircle,      bg: 'bg-slate-900',  border: 'border-red-500/50',     iconColor: 'text-red-400'     },
  warning: { Icon: AlertTriangle, bg: 'bg-slate-900', border: 'border-amber-500/50',   iconColor: 'text-amber-400'   },
  info:    { Icon: Info,          bg: 'bg-slate-900', border: 'border-blue-500/50',     iconColor: 'text-blue-400'    },
};

function Toast({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const { Icon, bg, border, iconColor } = CONFIGS[item.type];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-sm backdrop-blur-xl transition-all duration-300 ${
        item.dying ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      } ${bg} ${border}`}
      role="alert"
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
      <span className="flex-1 text-xs font-medium leading-relaxed text-slate-100">
        {item.message}
      </span>
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Tutup notifikasi"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
