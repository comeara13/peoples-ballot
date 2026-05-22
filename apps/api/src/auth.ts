import { verifyToken } from "@clerk/backend";

export type ClerkPayload = {
  sub: string;
  publicMetadata?: { role?: string };
};

export type Context = {
  clerkUserId: string | null;
  isAdmin: boolean;
};

export async function buildContext(
  req: Request,
  verify: (token: string, opts: object) => Promise<ClerkPayload> = verifyToken as (
    token: string,
    opts: object,
  ) => Promise<ClerkPayload>,
): Promise<Context> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return { clerkUserId: null, isAdmin: false };

  const token = authHeader.slice(7);
  try {
    const payload = await verify(token, { secretKey: process.env.CLERK_SECRET_KEY });
    const role = (payload.publicMetadata as { role?: string } | undefined)?.role;
    return { clerkUserId: payload.sub, isAdmin: role === "admin" };
  } catch {
    return { clerkUserId: null, isAdmin: false };
  }
}
