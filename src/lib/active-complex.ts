"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

const COOKIE_NAME = "activeComplexId";

/**
 * Read the active complex ID from the cookie (server-side).
 */
export async function getActiveComplexId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAME)?.value || null;
}

/**
 * Set the active complex ID cookie (server action).
 */
export async function setActiveComplexId(complexId: string) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, complexId, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });
}

/**
 * Clear the active complex cookie (for switching).
 */
export async function clearActiveComplexId() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the active complex ID, enforcing it exists.
 * For staff: uses their assigned complexId from session.
 * For admin: reads from cookie.
 * Returns null if no complex is set (admin needs to select).
 */
export async function getActiveComplexOrRedirect(): Promise<string | null> {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userComplexId = (session?.user as any)?.complexId;

    // Staff always uses their assigned complex
    if (userRole === "staff" && userComplexId) {
        return userComplexId;
    }

    // Admin reads from cookie
    const cookieId = await getActiveComplexId();
    return cookieId;
}
