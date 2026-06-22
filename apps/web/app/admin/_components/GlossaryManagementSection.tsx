"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";

export function GlossaryManagementSection() {
  const { data } = trpc.glossary.list.useQuery(undefined);
  const count = data?.length ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Glossary</h2>
        <Link
          href="/admin/glossary"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Manage glossary →
        </Link>
      </div>
      <p className="text-xs text-gray-500">
        {count} term{count !== 1 ? "s" : ""} defined. Link terms to individual ideas via the idea
        card in each bank.
      </p>
    </div>
  );
}
