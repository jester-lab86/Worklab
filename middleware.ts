import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("authjs.session-token") || 
                request.cookies.get("__Secure-authjs.session-token");
  
  const isLoggedIn = !!token;
  const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isOnProjects = request.nextUrl.pathname.startsWith("/projects");

  if ((isOnDashboard || isOnProjects) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*"],
};