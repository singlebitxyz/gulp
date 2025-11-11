"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBot } from "@/lib/query/hooks/bots";
import BotAnalytics from "@/components/dashboard/bots/bot-analytics";

export default function BotSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.id as string;
  const { data: bot, isLoading, error } = useBot(botId);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Bot Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error
                ? error.message
                : "The bot you're looking for doesn't exist"}
            </p>
            <Button
              onClick={() => router.push("/dashboard/bots")}
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bots
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/bots")}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{bot.name}</h1>
            <p className="text-muted-foreground">
              {bot.description || "No description"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/bots/${bot.id}/settings`)}
          size="lg"
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Analytics Dashboard */}
      <BotAnalytics botId={bot.id} />

      {/* Bot Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Configuration</CardTitle>
          <CardDescription>
            Current bot settings and information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                LLM Provider
              </p>
              <Badge variant="outline" className="text-sm">
                {bot.llm_provider}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Model
              </p>
              <p className="text-sm">
                {bot.llm_config?.model_name || "gpt-4o"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Temperature
              </p>
              <p className="text-sm">{bot.llm_config?.temperature || 0.7}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Max Tokens
              </p>
              <p className="text-sm">{bot.llm_config?.max_tokens || 1000}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Created
              </p>
              <p className="text-sm">
                {new Date(bot.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Retention Days
              </p>
              <p className="text-sm">{bot.retention_days} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
