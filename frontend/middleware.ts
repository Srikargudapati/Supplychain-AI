import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that do NOT require login
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/public(.*)",
]);

export default clerkMiddleware((auth, req) => {
  // If user is NOT logged in and route is protected → redirect to sign-in
  if (!auth().userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
});

// Required Next.js config
export const config = {
  matcher: [
    // Apply middleware to all routes except static files
    "/((?!_next|.*\\..*).*)",
  ],
};

