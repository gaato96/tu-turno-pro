import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

export default NextAuth(authConfig).auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const isLoginPage = nextUrl.pathname === "/login";
    const isApiRoute = nextUrl.pathname.startsWith("/api");
    const isPublicRoute = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/_next");

    // Allow API routes and public routes
    if (isApiRoute || isPublicRoute) return NextResponse.next();

    // Redirect non-logged-in users to login
    if (!isLoginPage && !isLoggedIn) {
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    if (isLoggedIn) {
        const userRole = (req.auth?.user as any)?.role;

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
        if (nextUrl.pathname.startsWith("/dashboard") && userRole === "super_admin") {
            return NextResponse.redirect(new URL("/admin/tenants", nextUrl));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
