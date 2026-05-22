"use client";

import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <SignIn routing="hash" />
    </main>
  );
}
