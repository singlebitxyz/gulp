"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Bot as BotIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBot, useUpdateBot } from "@/lib/query/hooks/bots";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BotTestChat from "@/components/dashboard/bots/bot-test-chat";
import BotSettingsForm from "@/components/dashboard/bots/bot-settings-form";
import BotTrainMode from "@/components/dashboard/bots/bot-train-mode";

export default function BotSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.id as string;
  const { data: bot, isLoading, error } = useBot(botId);
  const [activeTab, setActiveTab] = useState("settings");

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
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
              {error instanceof Error ? error.message : "The bot you're looking for doesn't exist"}
            </p>
            <Button onClick={() => router.push("/dashboard/bots")} variant="outline">
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/bots")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BotIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{bot.name}</h1>
            <p className="text-sm text-muted-foreground">Bot Settings & Configuration</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="train">Train</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <BotSettingsForm bot={bot} />
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <BotTestChat bot={bot} />
        </TabsContent>

        <TabsContent value="train" className="space-y-6">
          <BotTrainMode bot={bot} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

