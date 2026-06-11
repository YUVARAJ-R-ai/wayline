import { NextAuthOptions, User } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

// NOTE: In a real app, you'd fetch users from a database.
// The password here is a hash for "password", but our authorize function below just checks for the plain text "password" for simplicity.
const mockUsers = [
  {
    id: "1",
    email: "admin@wayline.com",
    // Hashed "password": bcrypt.hashSync("password", 10)
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", 
    name: "Admin User"
  }
];

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

        const user = mockUsers.find(u => u.email === credentials.email);
        
        // For this demo, we'll check the plain text password for simplicity.
        // In a real app, you would use: await bcrypt.compare(credentials.password, user.password)
        const isPasswordValid = user && credentials.password === "password";

        if (user && isPasswordValid) {
          // Return the user object to be encoded in the JWT
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        }
        
        // Return null if user not found or password invalid
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
      }
      return token;
    },
    // This callback is called whenever a session is accessed.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  }
};