import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("=== AUTHORIZE CALLED ===");
        console.log("received:", JSON.stringify(credentials?.password));
        console.log("expected:", JSON.stringify(process.env.FORGE_PASSWORD));
        console.log("match:", credentials?.password === process.env.FORGE_PASSWORD);

        if (credentials?.password === process.env.FORGE_PASSWORD) {
          return { id: "1", name: "Forge User" };
        }
        throw new Error("Invalid password.");
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
});