"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft } from "lucide-react";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export default function AdminShell({
  title,
  subtitle,
  children,
  actions,
}: AdminShellProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-red-500/14 bg-[#0d0d12] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(190,20,20,0.24),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,20,80,0.14),transparent_40%)]" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.30em] text-red-100/34">
              admin shell
            </div>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            {actions}
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/85 transition hover:bg-white/[0.07]"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour admin
            </button>
          </div>
        </div>
      </section>

      <section>{children}</section>
    </div>
  );
}
