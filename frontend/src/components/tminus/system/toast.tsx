"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/tminus/utils";

export type ToastTone = "lime" | "amber" | "coral" | "ink";

export interface ToastInput {
  title: string;
  body?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  tone: ToastTone;
}

interface ToastApi {
  toast: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      const item: ToastItem = { ...t, id, tone: t.tone ?? "ink" };
      setToasts((prev) => [...prev.slice(-2), item]);
      const duration = t.durationMs ?? 4_600;
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const TONE_STYLES: Record<ToastTone, { bar: string; chip: string }> = {
  lime: { bar: "bg-lime", chip: "bg-lime text-ink" },
  amber: { bar: "bg-amber", chip: "bg-amber text-ink" },
  coral: { bar: "bg-coral", chip: "bg-coral text-ink" },
  ink: { bar: "bg-ink", chip: "bg-ink text-bone" },
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(92vw,380px)] flex-col items-end gap-2"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onDismiss(t.id)}
          className={cn(
            "pointer-events-auto w-full overflow-hidden rounded-xl border-2 border-ink bg-paper p-0 text-left sticker",
            "animate-toast-in transition-transform hover:-translate-y-0.5",
          )}
        >
          <div className="flex items-stretch">
            <div className={cn("w-2 shrink-0", TONE_STYLES[t.tone].bar)} aria-hidden />
            <div className="px-4 py-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
                {t.title}
              </p>
              {t.body ? (
                <p className="mt-1 font-mono text-[10.5px] leading-relaxed tracking-[0.02em] text-fog">
                  {t.body}
                </p>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
