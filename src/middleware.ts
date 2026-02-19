import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const LOGIN_URL = "https://www.worldstreetgold.com/login";

// Routes that require authentication (all dashboard pages)
const isProtectedRoute = createRouteMatcher([
  "/",
  "/admin(.*)",
  "/assets(.*)",
  "/deposit(.*)",
  "/docs(.*)",
  "/forms(.*)",
  "/layout(.*)",
  "/spot(.*)",
  "/swap(.*)",
  "/tables(.*)",
  "/transactions(.*)",
  "/ui-components(.*)",
  "/withdraw(.*)",
]);

// API routes that require authentication
const isProtectedApi = createRouteMatcher([
  "/api/profile(.*)",
  "/api/wallet(.*)",
  "/api/trades(.*)",
  "/api/swap(.*)",
  "/api/p2p(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    try {
      await auth.protect();
    } catch {
      // Token invalid/expired/missing → redirect to WorldStreet login
      return NextResponse.redirect(LOGIN_URL);
    }
  }

  if (isProtectedApi(req)) {
    try {
      await auth.protect();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
