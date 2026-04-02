"use client";

import React from "react";

type Item = { href: string; label: string };

export default function PrivateTopNav({
  title = "EtherCristal",
  items = [],
  rightSlot,
}: {
  title?: string;
  items?: Item[];
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="ec-topnav">
      <div className="ec-topnav-left">
        <a className="ec-brand" href="/dashboard" aria-label="Aller au dashboard">
          <span className="ec-mark">EC</span>
          <span className="ec-brand-title">{title}</span>
        </a>

        <nav className="ec-navlinks" aria-label="Navigation privée">
          {items.map((it) => (
            <a key={it.href} className="ec-navlink" href={it.href}>
              {it.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="ec-topnav-right">{rightSlot}</div>
    </header>
  );
}
