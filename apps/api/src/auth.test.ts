import { describe, it, expect, mock } from "bun:test";
import { buildContext, type ClerkPayload } from "./auth";

const adminPayload: ClerkPayload = { sub: "user_admin_1", publicMetadata: { role: "admin" } };
const userPayload: ClerkPayload = { sub: "user_regular_2", publicMetadata: { role: "voter" } };

const withToken = (token: string) =>
  new Request("http://localhost/trpc", { headers: { Authorization: `Bearer ${token}` } });
const withoutToken = () => new Request("http://localhost/trpc");

describe("buildContext", () => {
  it("no auth header → null userId, isAdmin false", async () => {
    const ctx = await buildContext(withoutToken());
    expect(ctx.clerkUserId).toBeNull();
    expect(ctx.isAdmin).toBe(false);
  });

  it("non-Bearer header → null userId, isAdmin false", async () => {
    const req = new Request("http://localhost/trpc", {
      headers: { Authorization: "Basic abc123" },
    });
    const ctx = await buildContext(req);
    expect(ctx.clerkUserId).toBeNull();
    expect(ctx.isAdmin).toBe(false);
  });

  it("verifyToken throws → null userId, isAdmin false", async () => {
    const fakeVerify = mock(async () => {
      throw new Error("invalid token");
    });
    const ctx = await buildContext(withToken("bad-token"), fakeVerify as never);
    expect(ctx.clerkUserId).toBeNull();
    expect(ctx.isAdmin).toBe(false);
  });

  it("valid admin token → correct userId, isAdmin true", async () => {
    const fakeVerify = mock(async () => adminPayload);
    const ctx = await buildContext(withToken("admin-jwt"), fakeVerify as never);
    expect(ctx.clerkUserId).toBe("user_admin_1");
    expect(ctx.isAdmin).toBe(true);
  });

  it("valid non-admin token → correct userId, isAdmin false", async () => {
    const fakeVerify = mock(async () => userPayload);
    const ctx = await buildContext(withToken("user-jwt"), fakeVerify as never);
    expect(ctx.clerkUserId).toBe("user_regular_2");
    expect(ctx.isAdmin).toBe(false);
  });

  it("token with no publicMetadata → isAdmin false", async () => {
    const fakeVerify = mock(async () => ({ sub: "user_nometadata" }) as ClerkPayload);
    const ctx = await buildContext(withToken("no-meta-jwt"), fakeVerify as never);
    expect(ctx.clerkUserId).toBe("user_nometadata");
    expect(ctx.isAdmin).toBe(false);
  });
});
