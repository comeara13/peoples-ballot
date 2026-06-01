"use client";

import { ClerkProvider as BaseClerkProvider } from "@clerk/clerk-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ComponentProps } from "react";

// Strips __clerk_handshake/__clerk_status via router.replace() so the App Router's
// URL snapshot is clean before clerk-js fires its own async window.history.replaceState,
// preventing it from overwriting a user-triggered router.push() (snap-back bug).
function ClerkParamCleaner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasClerkParams =
      searchParams.has("__clerk_handshake") || searchParams.has("__clerk_status");
    if (!hasClerkParams) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("__clerk_handshake");
    params.delete("__clerk_status");
    const clean = params.toString() !== "" ? `${pathname}?${params}` : pathname;
    router.replace(clean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — captures param state at page load

  return null;
}

export function ClerkProvider(props: ComponentProps<typeof BaseClerkProvider>) {
  return (
    <BaseClerkProvider {...props}>
      <Suspense>
        <ClerkParamCleaner />
      </Suspense>
      {props.children}
    </BaseClerkProvider>
  );
}
