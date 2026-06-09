Of course! It looks like you have a guide that's a bit scattered and missing some crucial page components. I've taken all the information you provided, filled in the missing pieces, and organized it into a single, complete, step-by-step guide.

This will get your entire authentication flow and dashboard structure running from scratch.

Let's do this.

---

### **Complete Dashboard Setup: A Clear, Step-by-Step Guide**

Here is the complete plan. We'll create all the necessary files, including the login and dashboard pages that were missing from your original instructions.

#### **Step 1: Start a New Next.js Project (If you haven't already)**

If you don't have a project yet, open your terminal and run:
```bash
npx create-next-app@latest wayline-dashboard
```
When prompted, choose the following options:
*   **Would you like to use TypeScript?** `Yes`
*   **Would you like to use ESLint?** `Yes`
*   **Would you like to use Tailwind CSS?** `Yes` (Recommended for styling)
*   **Would you like to use `src/` directory?** `No` (To match the guide's structure)
*   **Would you like to use App Router?** `Yes` (This is required)
*   **Would you like to customize the default import alias?** `No` (Let it default to `@/*`)

Then, navigate into your new project directory:
```bash
cd wayline-dashboard
```

#### **Step 2: Install Dependencies**

In your project terminal, run these two commands to install all the necessary packages:
```bash
npm install next-auth bcryptjs jsonwebtoken recharts lucide-react
```
```bash
npm install -D @types/bcryptjs @types/jsonwebtoken
```
*(Note: `-D` installs them as development dependencies, which is the correct place for type definitions.)*

#### **Step 3: Set Up Environment Variables**

This is a critical step for security. Create a new file in the **root** of your project called `.env.local`.

**File: `.env.local`**
```env
# A strong, random secret is required for JWT encryption.
# You can generate one here: https://generate-secret.vercel.app/32
NEXTAUTH_SECRET=replace-this-with-a-super-long-and-random-secret-key

# The full URL of your application, used for redirects.
NEXTAUTH_URL=http://localhost:3000
```
**Important:** Replace the `NEXTAUTH_SECRET` value with your own unique, randomly generated secret.

#### **Step 4: Create the File Structure & Add Code**

Now, let's create all the folders and files. I'm including the code for **all** the files you'll need, including the pages that were missing from your guide.

First, let's update your main layout to include the `SessionProvider`.

**File 1: `app/layout.tsx`** (Replace the existing file with this)
```typescript
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Wayline Dashboard',
  description: 'Manage your Wayline API keys',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

Now, create the other files and folders.

**File 2: `lib/auth.ts`**
```typescript
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
```

**File 3: `app/api/auth/[...nextauth]/route.ts`**
```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

**File 4: `components/providers.tsx`**
```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
```

**File 5: `app/page.tsx`** (This will be your homepage)
```tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // If user is already logged in, redirect them to the dashboard
  if (session) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Wayline</h1>
        <p className="text-lg text-gray-600 mb-8">Your dashboard awaits. Please sign in to continue.</p>
        <Link href="/login" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
          Sign In
        </Link>
      </div>
    </main>
  )
}
```

**File 6: `app/login/page.tsx`** (The missing login form)
```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@wayline.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else if (result?.ok) {
      // Redirect to the dashboard on successful login
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Sign In</h2>
        {error && <p className="mb-4 text-center text-red-500 bg-red-100 p-2 rounded">{error}</p>}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          >
            Sign In
          </button>
        </div>
        <div className="text-center mt-4 text-sm text-gray-600">
            <p>Use: <span className="font-mono">admin@wayline.com</span></p>
            <p>Password: <span className="font-mono">password</span></p>
        </div>
      </form>
    </div>
  );
}
```

**File 7: `app/dashboard/layout.tsx`** (To protect the dashboard routes)
```tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { signOut } from "next-auth/react" // Client-side for button
import { SignOutButton } from "@/components/SignOutButton"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // If there's no session, redirect to the login page
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                <div className="flex-shrink-0">
                    <h1 className="text-xl font-bold text-gray-800">Wayline Dashboard</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <p className="text-sm text-gray-600">Welcome, {session.user?.name}</p>
                    <SignOutButton />
                </div>
            </div>
        </nav>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
```
*Notice this layout needs a `<SignOutButton />`. Let's create that small component.*

**File 8: `components/SignOutButton.tsx`**
```tsx
"use client"
import { signOut } from "next-auth/react"

export function SignOutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
            Sign Out
        </button>
    )
}
```


**File 9: `app/dashboard/page.tsx`** (The main dashboard view)
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Dashboard Overview
      </h2>
      <div className="p-6 bg-white rounded-lg shadow">
        <p>This is your main dashboard page. The beautiful charts and stats will go here!</p>
      </div>
    </div>
  )
}
```

**File 10: `app/dashboard/keys/page.tsx`** (Placeholder for the keys page)
```tsx
export default function ApiKeysPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Manage API Keys
      </h2>
      <div className="p-6 bg-white rounded-lg shadow">
        <p>Your API key management interface will live here.</p>
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Generate New Key
        </button>
      </div>
    </div>
  )
}
```

#### **Step 5: Run and Test Your Application**

You're all set! Now, run the development server:
```bash
npm run dev
```
**Open your browser and test the complete flow:**

1.  **Go to `http://localhost:3000`**. You should see the "Welcome to Wayline" homepage with a "Sign In" button.
2.  **Click "Sign In"**. You will be taken to the `/login` page.
3.  **Log in with the credentials**:
    *   Email: `admin@wayline.com`
    *   Password: `password`
4.  **On success**, you should be automatically redirected to `http://localhost:3000/dashboard`.
5.  **On the dashboard**, you should see "Welcome, Admin User" in the header and a "Sign Out" button.
6.  **Try accessing `http://localhost:3000/dashboard/keys`**. You should see the API Keys page within the dashboard layout.
7.  **Click "Sign Out"**. You should be redirected back to the homepage at `/`.

If you've followed these steps, you will have a fully functional authentication system and dashboard structure. Let me know if you encounter any errorss



###  Links:
[[connection-key-versel]]