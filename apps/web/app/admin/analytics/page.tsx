"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminGuard } from "@/components/AdminGuard";

function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  const bankId = searchParams.get("bankId");

  if (!bankId) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-600">
          No campaign selected.{" "}
          <Link href="/admin" className="text-blue-600 hover:underline">
            Go back to Admin
          </Link>
          .
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/admin?bankId=${bankId}`}
            className="text-sm text-gray-500 hover:text-gray-800 font-medium"
          >
            ← Back to Bank
          </Link>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-6">Analytics</h1>

        {/* AnalyticsTable renders here */}
      </div>
    </main>
  );
}

export default function AnalyticsPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <main className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-600">Loading…</div>
          </main>
        }
      >
        <AnalyticsPageContent />
      </Suspense>
    </AdminGuard>
  );
}
