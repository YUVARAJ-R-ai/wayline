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