import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Comma-separated list of Google account emails allowed to use the app,
// e.g. "herbert@pamojasidebyside.org,teammate@gmail.com". Set in Vercel as
// ALLOWED_EMAILS. Left empty, any Google account could sign in — always set
// this once you have real users.
const allowedEmails = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Required for platforms like Vercel that sit behind a proxy.
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (allowedEmails.length === 0) return true;
      return Boolean(user?.email && allowedEmails.includes(user.email.toLowerCase()));
    },
  },
  pages: {
    error: "/",
  },
});
