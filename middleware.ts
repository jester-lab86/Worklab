import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session;
  const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isOnProjects = request.nextUrl.pathname.startsWith("/projects");

  if ((isOnDashboard || isOnProjects) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", request.nextUrl));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*"],
};