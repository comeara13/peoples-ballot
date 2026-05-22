"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { GlossaryTerm } from "@/types/ballot";

interface GlossaryPopoverProps {
  terms: GlossaryTerm[];
  ideaText: string;
}

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 280;
const MARGIN = 8;

export function GlossaryPopover({ terms, ideaText }: GlossaryPopoverProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Focus the popover when it opens (keyboard accessibility).
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Click-outside: close when a mousedown lands outside both trigger and popover.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dialogRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  if (terms.length === 0) return null;

  function openPopover() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top =
      rect.bottom + MARGIN + POPOVER_HEIGHT > vh
        ? rect.top - POPOVER_HEIGHT - MARGIN
        : rect.bottom + MARGIN;
    const left = Math.max(MARGIN, Math.min(rect.left, vw - POPOVER_WIDTH - MARGIN));
    setPos({ top, left });
    setOpen(true);
  }

  const label = `Definitions for: ${ideaText.slice(0, 60)}`;

  return (
    <>
      <button
        ref={triggerRef}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          open ? setOpen(false) : openPopover();
        }}
        onMouseEnter={() => { cancelClose(); openPopover(); }}
        onMouseLeave={scheduleClose}
        className={[
          "-m-3 p-3 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          open ? "text-blue-500" : "text-gray-400 hover:text-blue-500",
        ].join(" ")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          width={18}
          height={18}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && pos && (
        <div
          ref={dialogRef}
          id={id}
          role="dialog"
          aria-modal="false"
          aria-label={label}
          tabIndex={-1}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
          className="z-20 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto p-4 focus:outline-none"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <button
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            aria-label="Close definitions"
            className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 leading-none"
          >
            ×
          </button>
          <ul className="space-y-4 list-none p-0 m-0 pr-4">
            {terms.map((term) => (
              <li key={term.id}>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">{term.title}</h3>
                <div className="text-sm text-gray-600 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold">
                  <Markdown>{term.body}</Markdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
