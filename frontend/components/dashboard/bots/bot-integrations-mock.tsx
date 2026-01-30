"use client";

import { useState } from "react";
import { Calendar, CheckCircle, Link2Off, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

/**
 * Mock Integrations tab for video/demo recording.
 * Mirrors CALENDAR_LEADS_INTEGRATION_PLAN: Bot Settings → Integrations.
 * No real OAuth or API calls — UI only.
 */
export default function BotIntegrationsMock() {
  const [calendarStatus, setCalendarStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [lastUsed, setLastUsed] = useState<string | null>(null);

  const handleConnect = () => {
    setCalendarStatus("connecting");
    // Simulate OAuth redirect delay
    setTimeout(() => {
      setCalendarStatus("connected");
      setLastUsed(new Date().toISOString());
      toast.success("Google Calendar connected", {
        description: "You can now book meetings through your bot.",
      });
    }, 1500);
  };

  const handleDisconnect = () => {
    setCalendarStatus("disconnected");
    setLastUsed(null);
    toast.info("Google Calendar disconnected");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
        <strong>Demo / Mock UI</strong> — For video recording. No real OAuth or
        API calls.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect your calendar so your bot can check availability and book
            meetings for visitors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  calendarStatus === "connected"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-muted"
                }`}
              >
                {calendarStatus === "connected" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {calendarStatus === "connected"
                    ? "Connected"
                    : "Not connected"}
                </p>
                {lastUsed && (
                  <p className="text-xs text-muted-foreground">
                    Last used:{" "}
                    {new Date(lastUsed).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
              {calendarStatus === "connected" && (
                <Badge variant="secondary" className="bg-green-500/10">
                  Active
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {calendarStatus === "disconnected" && (
                <Button onClick={handleConnect} disabled={calendarStatus === "connecting"}>
                  {calendarStatus === "connecting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    "Connect Google Calendar"
                  )}
                </Button>
              )}
              {calendarStatus === "connected" && (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Link2Off className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            When connected, your bot can check your availability and create
            calendar events when visitors request a meeting. Tokens are stored
            securely and refreshed automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
