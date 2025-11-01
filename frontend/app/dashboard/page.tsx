"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bot } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  // Redirect to bots page as the main dashboard
  useEffect(() => {
    router.replace("/dashboard/bots");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <Bot className="h-8 w-8 animate-pulse text-primary" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}
