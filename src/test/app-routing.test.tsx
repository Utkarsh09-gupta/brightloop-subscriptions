import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches /invoices and /payments routes cleanly", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const invoiceMatches = router.matchRoutes("/invoices");
    expect(invoiceMatches.at(-1)?.routeId).toBe("/invoices");

    const paymentMatches = router.matchRoutes("/payments");
    expect(paymentMatches.at(-1)?.routeId).toBe("/payments");
  });

  it("matches /login and /signup auth routes cleanly", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const loginMatches = router.matchRoutes("/login");
    expect(loginMatches.at(-1)?.routeId).toBe("/login");

    const signupMatches = router.matchRoutes("/signup");
    expect(signupMatches.at(-1)?.routeId).toBe("/signup");
  });
});
