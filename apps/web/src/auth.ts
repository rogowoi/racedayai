import NextAuth from "next-auth";
import Strava from "next-auth/providers/strava";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { trackServerEvent } from "@/lib/posthog-server";
import { AnalyticsEvent } from "@/lib/analytics";
import {
  getStravaActivities,
  getStravaProfile,
  getStravaZones,
  extractFitnessMetrics,
} from "@/lib/strava";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Strava({
      clientId: process.env.STRAVA_CLIENT_ID?.trim(),
      clientSecret: process.env.STRAVA_CLIENT_SECRET?.trim(),
      authorization: {
        params: {
          scope: "read,activity:read_all",
        },
      },
      checks: ["state"], // Strava doesn't support PKCE
      profile(profile) {
        return {
          id: String(profile.id),
          name: `${profile.firstname} ${profile.lastname}`,
          email: profile.email ?? `strava_${profile.id}@athletes.racedayai.com`,
          image: profile.profile,
        };
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
    async signIn({ user, account, profile }) {
      // Handle Strava OAuth sign-in
      if (account?.provider === "strava" && user?.id && account.access_token) {
        try {
          // Save Strava token to athlete profile
          const athlete = await prisma.athlete.findUnique({
            where: { userId: user.id },
          });

          const isNewConnection = athlete && !athlete.stravaConnected;

          if (athlete) {
            await prisma.athlete.update({
              where: { id: athlete.id },
              data: {
                stravaConnected: true,
                stravaToken: {
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                },
              },
            });

            // Track Strava connection (signup or login)
            if (isNewConnection) {
              trackServerEvent(user.id, AnalyticsEvent.STRAVA_CONNECTED, {
                method: "oauth",
              }).catch(() => {});
            }

            // Track signup if this is first time seeing this user
            const isFirstSignIn = account.type === "oauth" && !athlete.stravaConnected;
            if (isFirstSignIn) {
              trackServerEvent(user.id, AnalyticsEvent.SIGNUP_COMPLETED, {
                method: "strava",
                email: user.email,
              }).catch(() => {});
            } else {
              trackServerEvent(user.id, AnalyticsEvent.LOGIN_COMPLETED, {
                method: "strava",
              }).catch(() => {});
            }

            // Auto-sync fitness metrics from Strava on sign-in
            // Uses math-only estimation (no LLM) to keep sign-in fast
            try {
              const token = account.access_token as string;
              const [profile, zones, activities] = await Promise.all([
                getStravaProfile(token).catch(() => null),
                getStravaZones(token).catch(() => ({})),
                getStravaActivities(token).catch(() => []),
              ]);

              if (activities.length > 0) {
                const mathMetrics = extractFitnessMetrics(activities, zones, profile);

                await prisma.athlete.update({
                  where: { id: athlete.id },
                  data: {
                    ftpWatts: mathMetrics.ftpWatts,
                    thresholdPaceSec: mathMetrics.thresholdPaceSec,
                    cssPer100mSec: mathMetrics.cssPer100mSec,
                    maxHr: mathMetrics.maxHr,
                    ...(mathMetrics.weightKg != null && { weightKg: mathMetrics.weightKg }),
                    ...(mathMetrics.gender != null && { gender: mathMetrics.gender }),
                  },
                });
              }
            } catch (syncError) {
              console.error("Auto-sync on sign-in failed:", syncError);
            }
          }
        } catch (error) {
          console.error("Error saving Strava token:", error);
          // Continue sign-in even if token save fails
        }
      }
      return true;
    },
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
