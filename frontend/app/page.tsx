import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from 'next/navigation';
import HomePageClient from "@/components/HomePageClient";

export default async function HomePage() {
  // This server-side logic remains here.
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  // Now, we just render our client component which handles the map.
  return <HomePageClient />;
}