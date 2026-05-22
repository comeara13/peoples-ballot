"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";

export function Nav() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-4xl px-4 flex items-center h-12 gap-6">
        <span className="text-sm font-semibold text-gray-800 tracking-wide">All Our Ideas</span>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
              pathname === "/"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Ballot
          </Link>
          {isSignedIn && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                pathname?.startsWith("/admin")
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Admin
            </Link>
          )}
        </div>
        <div className="ml-auto">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <Link
              href="/sign-in"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
