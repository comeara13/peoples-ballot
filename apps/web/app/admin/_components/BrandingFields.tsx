"use client";

import { useId } from "react";

export function BrandingField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  onClear,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label htmlFor={id} className="block text-xs font-medium text-gray-700">{label}</label>
        {onClear && value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
}

export function MarkdownField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-0.5">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 bg-white font-mono placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
}
