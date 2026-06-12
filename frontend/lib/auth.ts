import { NextAuthOptions, User } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const backendUrl = process.env.BACKEND_URL || "http://api-gateway:3000";
          const res = await fetch(`${backendUrl}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            return null;
          }

          const data = await res.json();

          if (data && data.token && data.user) {
            // Return user object combined with token
            // NextAuth will save the returned fields to the JWT/session.
            return {
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.email.split("@")[0], // Fallback name
              token: data.token, // Store the token in the user object
            };
          }
        } catch (error) {
          console.error("NextAuth authorize error:", error);
        }

        return null;
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    // This callback is called whenever a JWT is created.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.accessToken = (user as any).token;
      }
      return token;
    },
    // This callback is called whenever a session is accessed.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).accessToken = token.accessToken as string;
      }
      return session;
    }
  }
};