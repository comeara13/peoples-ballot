"use client";

import { useState } from "react";

export function CollapsibleSection({
  title,
  defaultOpen = true,
  actions,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-200 mt-6">
      <div className="flex items-center justify-between py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 text-left group"
          aria-expanded={open}
        >
          <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {title}
          </h2>
          <span className="text-gray-400 text-xs" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
        </button>
        {actions && <div className="flex items-center gap-2 ml-3 shrink-0">{actions}</div>}
      </div>
      {open && <div className="pb-6">{children}</div>}
    </div>
  );
}
