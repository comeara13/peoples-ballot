"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/clerk-react";
import { BankList } from "./_components/BankList";
import { BankDetail } from "./_components/BankDetail";
import { PartyDetail } from "./_components/PartyDetail";
import { TagManagementSection } from "./_components/TagManagementSection";
import { GlossaryManagementSection } from "./_components/GlossaryManagementSection";

function AdminContent() {
  const searchParams = useSearchParams();
  const bankId = searchParams.get("bankId");
  const partyId = searchParams.get("partyId");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {bankId && partyId ? (
          <PartyDetail bankId={bankId} partyId={partyId} />
        ) : bankId ? (
          <BankDetail bankId={bankId} />
        ) : (
          <>
            <BankList />
            <div className="my-8 border-t border-gray-200" />
            <TagManagementSection />
            <div className="my-8 border-t border-gray-200" />
            <GlossaryManagementSection />
          </>
        )}
      </div>
    </main>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, sessionClaims } = useAuth();
  const router = useRouter();
  const isAdmin =
    (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role === "admin";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!isAdmin) router.replace("/");
  }, [isLoaded, isSignedIn, isAdmin, router]);

  if (!isLoaded || !isSignedIn || !isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-600">
          {!isLoaded ? "Loading…" : isSignedIn && !isAdmin ? "You don't have permission to access this page." : "Redirecting…"}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <main className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-600">Loading…</div>
          </main>
        }
      >
        <AdminContent />
      </Suspense>
    </AdminGuard>
  );
}
