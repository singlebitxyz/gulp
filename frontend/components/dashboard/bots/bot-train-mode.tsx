"use client";

import { Bot, GraduationCap, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui";
import type { Bot } from "@/lib/types/bot";

interface BotTrainModeProps {
  bot: Bot;
}

export default function BotTrainMode({ bot }: BotTrainModeProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <CardTitle>Train Mode</CardTitle>
        </div>
        <CardDescription>
          Train and improve your bot's system prompt based on conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Coming Soon</AlertTitle>
          <AlertDescription>
            Train mode will allow you to refine your bot's system prompt based on
            actual conversations. This feature will be implemented in Phase 11
            (System Prompt Training) of the implementation plan.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 pt-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current System Prompt</span>
              <Badge variant="outline">{bot.llm_provider}</Badge>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-md">
              {bot.system_prompt}
            </p>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Training Features (Planned):</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Analyze test conversations to identify improvements</li>
              <li>Auto-suggest prompt refinements based on performance</li>
              <li>Version control for system prompt updates</li>
              <li>Rollback to previous prompt versions</li>
              <li>A/B testing between prompt variations</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

