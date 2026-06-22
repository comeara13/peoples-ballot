"use client";

import { useId, useState } from "react";

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
  const panelId = useId();

  return (
    <div className="border-t border-gray-200 mt-6">
      <div className="flex items-center justify-between py-3">
        {/* h2 wraps button per W3C APG accordion pattern — combines heading
            navigation with aria-expanded disclosure semantics */}
        <h2 className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 text-left group"
            aria-expanded={open}
            aria-controls={panelId}
          >
            <span className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {title}
            </span>
            <span className="text-gray-500 text-xs" aria-hidden="true">
              {open ? "▾" : "▸"}
            </span>
          </button>
        </h2>
        {actions && <div className="flex items-center gap-2 ml-3 shrink-0">{actions}</div>}
      </div>
      {/* Always in DOM so aria-controls resolves; content still lazy-mounts */}
      <div id={panelId} hidden={!open}>
        {open && <div className="pb-6">{children}</div>}
      </div>
    </div>
  );
}
