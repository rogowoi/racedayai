import NextAuth from "next-auth";
import Strava from "next-auth/providers/strava";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Strava({
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read,activity:read_all",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValidPassword = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      // For OAuth (database sessions), attach user ID from user object
      if (user) {
        session.user.id = user.id;
      }
      // For credentials (JWT sessions), attach user ID from token
      if (token) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt", // Required for credentials provider
  },
});
