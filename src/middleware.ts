import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

export default NextAuth(authConfig).auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const isLoginPage = nextUrl.pathname === "/login";
    const isApiRoute = nextUrl.pathname.startsWith("/api");
    const isPublicRoute = nextUrl.pathname === "/" || nextUrl.pathname === "/test" || nextUrl.pathname.startsWith("/_next");

    // Allow API routes and public routes
    if (isApiRoute || isPublicRoute) return NextResponse.next();

    // Redirect non-logged-in users to login
    if (!isLoginPage && !isLoggedIn) {
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    if (isLoggedIn) {
        const userRole = (req.auth?.user as any)?.role;
        const activeComplexId = req.cookies.get('activeComplexId')?.value;
        const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard');
        const isSelectComplexRoute = nextUrl.pathname.startsWith('/dashboard/select-complex');

        // Redirect logged-in users away from login
        if (isLoginPage) {
            if (userRole === "super_admin") {
                return NextResponse.redirect(new URL("/admin/tenants", nextUrl));
            } else {
                return NextResponse.redirect(new URL("/dashboard", nextUrl));
            }
        }

        // Restrict /admin to super_admin only
        if (nextUrl.pathname.startsWith("/admin") && userRole !== "super_admin") {
            return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }

        // Prevent super_admin from accessing standard dashboard
        if (isDashboardRoute && userRole === "super_admin") {
            return NextResponse.redirect(new URL("/admin/tenants", nextUrl));
        }

        // Enforce complex selection for admins on dashboard routes
        if (isDashboardRoute && userRole === "admin" && !isSelectComplexRoute && !activeComplexId) {
            return NextResponse.redirect(new URL("/dashboard/select-complex", nextUrl));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
