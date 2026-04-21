import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: { scope: "read:user user:email repo" },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "github" || !profile) return false;

      const githubProfile = profile as unknown as {
        id: number;
        login: string;
        avatar_url: string;
      };

      await prisma.user.upsert({
        where: { githubId: String(githubProfile.id) },
        update: {
          username: githubProfile.login,
          email: user.email ?? undefined,
          avatarUrl: githubProfile.avatar_url,
          accessToken: account.access_token!,
        },
        create: {
          githubId: String(githubProfile.id),
          username: githubProfile.login,
          email: user.email ?? undefined,
          avatarUrl: githubProfile.avatar_url,
          accessToken: account.access_token!,
        },
      });

      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { githubId: token.sub },
          select: { id: true, plan: true, username: true, avatarUrl: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.plan = dbUser.plan;
          session.user.username = dbUser.username;
          session.user.image = dbUser.avatarUrl ?? undefined;
        }
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.sub = String((profile as unknown as { id: number }).id);
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: string;
      username: string;
      image?: string;
      name?: string | null;
      email?: string | null;
    };
  }
}
