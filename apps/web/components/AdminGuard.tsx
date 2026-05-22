"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
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
          {!isLoaded
            ? "Loading…"
            : isSignedIn && !isAdmin
              ? "You don't have permission to access this page."
              : "Redirecting…"}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
