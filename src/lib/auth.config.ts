import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    trustHost: true,
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // refresh token every 24h
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.tenantId = (user as any).tenantId;
                token.tenantName = (user as any).tenantName;
                token.tenantSlug = (user as any).tenantSlug;
                token.tenantModules = (user as any).tenantModules;
                token.userModules = (user as any).userModules;
                token.complexId = (user as any).complexId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).role = token.role;
                (session.user as any).tenantId = token.tenantId;
                (session.user as any).tenantName = token.tenantName;
                (session.user as any).tenantSlug = token.tenantSlug;
                (session.user as any).tenantModules = token.tenantModules;
                (session.user as any).userModules = token.userModules;
                (session.user as any).complexId = token.complexId;
            }
            return session;
        },
    },
    providers: [], // configured in auth.ts
} satisfies NextAuthConfig;
