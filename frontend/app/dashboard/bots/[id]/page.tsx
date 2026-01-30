"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bot as BotIcon } from "lucide-react";
import BotAnalytics from "@/components/dashboard/bots/bot-analytics";
import BotIntegrationsMock from "@/components/dashboard/bots/bot-integrations-mock";
import BotLeadsMock from "@/components/dashboard/bots/bot-leads-mock";
import BotSampleChat from "@/components/dashboard/bots/bot-sample-chat";
import BotSettingsForm from "@/components/dashboard/bots/bot-settings-form";
import BotSourcesManagement from "@/components/dashboard/bots/bot-sources-management";
import BotTestChat from "@/components/dashboard/bots/bot-test-chat";
import BotTrainMode from "@/components/dashboard/bots/bot-train-mode";
import BotWidgetManagement from "@/components/dashboard/bots/bot-widget-management";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBot } from "@/lib/query/hooks/bots";
import { useBreadcrumbs } from "@/lib/hooks/use-breadcrumbs";

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const botId = params.id as string;
  const { data: bot, isLoading, error } = useBot(botId);
  const [activeTab, setActiveTab] = useState("settings");
  const { setBreadcrumbs } = useBreadcrumbs();

  // Update breadcrumbs when bot data is loaded
  useEffect(() => {
    if (bot) {
      setBreadcrumbs([
        { label: "Dashboard", href: "/dashboard" },
        { label: "Bots", href: "/dashboard/bots" },
        { label: bot.name, href: `/dashboard/bots/${bot.id}` },
      ]);
    }
    // Cleanup: restore auto-generated breadcrumbs when component unmounts
    return () => {
      // The GlobalBreadcrumb component will regenerate breadcrumbs on pathname change
    };
  }, [bot, setBreadcrumbs]);

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
            <p className="text-sm text-muted-foreground">
              {bot.description || "No description"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        {/* Mobile Dropdown */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="settings">Settings</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="sources">Sources</SelectItem>
              <SelectItem value="widget">Widget</SelectItem>
              <SelectItem value="integrations">Integrations</SelectItem>
              <SelectItem value="leads">Leads</SelectItem>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="sample">Sample Chat</SelectItem>
              <SelectItem value="train">Train</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Tabs */}
        <TabsList className="hidden md:grid w-full grid-cols-9">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="widget">Widget</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="sample">Sample Chat</TabsTrigger>
          <TabsTrigger value="train">Train</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <BotSettingsForm bot={bot} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <BotAnalytics botId={bot.id} />
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <BotSourcesManagement botId={bot.id} />
        </TabsContent>

        <TabsContent value="widget" className="space-y-6">
          <BotWidgetManagement botId={bot.id} />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <BotIntegrationsMock />
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          <BotLeadsMock />
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <BotTestChat bot={bot} />
        </TabsContent>

        <TabsContent value="sample" className="space-y-6">
          <BotSampleChat bot={bot} />
        </TabsContent>

        <TabsContent value="train" className="space-y-6">
          <BotTrainMode bot={bot} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
