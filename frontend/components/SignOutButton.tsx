"use client"
import { signOut } from "next-auth/react"

export function SignOutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-1.5 text-sm font-semibold text-text-secondary bg-bg-surface border border-border-default rounded-xl hover:bg-bg-elevated hover:text-text-primary transition-all focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
        >
            Sign Out
        </button>
    )
}