"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  createdAt: number;
  ttlMs: number;
};

type ToastApi = {
  success: (title: string, message?: string, ttlMs?: number) => void;
  error: (title: string, message?: string, ttlMs?: number) => void;
  info: (title: string, message?: string, ttlMs?: number) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current[id];
    if (t) window.clearTimeout(t);
    delete timers.current[id];
  };

  const push = (type: ToastType, title: string, message?: string, ttlMs = 3400) => {
    const id = uid();
    const toast: ToastItem = { id, type, title, message, createdAt: Date.now(), ttlMs };

    setItems((prev) => [toast, ...prev].slice(0, 3));

    timers.current[id] = window.setTimeout(() => dismiss(id), ttlMs);
  };

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, m, ttl) => push("success", t, m, ttl),
      error: (t, m, ttl) => push("error", t, m, ttl),
      info: (t, m, ttl) => push("info", t, m, ttl),
      dismiss,
    }),
    []
  );

  useEffect(() => {
    return () => {
      for (const id of Object.keys(timers.current)) {
        window.clearTimeout(timers.current[id]);
      }
      timers.current = {};
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() must be used inside <ToastProvider>.");
  return ctx;
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] w-[min(420px,calc(100vw-2rem))] space-y-3">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const tones: Record<ToastType, string> = {
    success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    error: "border-red-400/20 bg-red-500/10 text-red-100",
    info: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  const icon = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-200" />,
    error: <AlertTriangle className="h-5 w-5 text-red-200" />,
    info: <Info className="h-5 w-5 text-cyan-200" />,
  }[item.type];

  return (
    <div className="pointer-events-auto animate-[toastIn_220ms_ease-out]">
      <div
        className={cx(
          "relative overflow-hidden rounded-[22px] border p-4 shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl",
          tones[item.type]
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0))]" />
        <div className="relative flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-black tracking-tight">{item.title}</div>
            {item.message ? (
              <div className="mt-1 text-xs leading-5 opacity-85">{item.message}</div>
            ) : null}
          </div>

          <button
            onClick={() => onDismiss(item.id)}
            className="rounded-xl border border-white/10 bg-white/10 p-1.5 text-white/80 hover:bg-white/15"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full w-full origin-left animate-[toastBar_linear_forwards]"
            style={{ animationDuration: `${item.ttlMs}ms` }}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes toastIn {
          from {
            transform: translateY(-8px);
            opacity: 0;
          }
          to {
            transform: translateY(0px);
            opacity: 1;
          }
        }
        @keyframes toastBar {
          from {
            transform: scaleX(1);
            background: rgba(255, 255, 255, 0.45);
          }
          to {
            transform: scaleX(0);
            background: rgba(255, 255, 255, 0.18);
          }
        }
      `}</style>
    </div>
  );
}
