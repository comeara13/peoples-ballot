"use client";

import { ClerkProvider as BaseClerkProvider } from "@clerk/clerk-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ComponentProps } from "react";

// clerk-js (the CDN bundle) cleans up __clerk_handshake from the URL using
// window.history.replaceState directly, bypassing Next.js's router. It also
// captures the URL at page-load time and writes back its pre-built clean URL
// *after* its async FAPI exchange completes — which can overwrite a
// router.push() the user triggered in the meantime (the "snap-back" bug).
//
// This component strips Clerk's own query params via router.replace() *before*
// any user interaction, so the App Router's URL snapshot is clean and the
// async replaceState from clerk-js is a no-op (the params are already gone).
function ClerkParamCleaner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasClerkParams =
      searchParams.has("__clerk_handshake") || searchParams.has("__clerk_status");
    if (!hasClerkParams) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("__clerk_handshake");
    params.delete("__clerk_status");
    const clean = params.size > 0 ? `/?${params}` : "/";
    router.replace(clean);
  // Run once on mount — param values at mount time are what matter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function ClerkProvider(props: ComponentProps<typeof BaseClerkProvider>) {
  return (
    <BaseClerkProvider {...props}>
      <ClerkParamCleaner />
      {props.children}
    </BaseClerkProvider>
  );
}
