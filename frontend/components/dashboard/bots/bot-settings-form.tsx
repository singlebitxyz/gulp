"use client";

import { useState, useEffect } from "react";
import { Save, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useUpdateBot } from "@/lib/query/hooks/bots";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { Bot, BotUpdateInput, LLMProvider } from "@/lib/types/bot";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BotSettingsFormProps {
  bot: Bot;
}

export default function BotSettingsForm({ bot }: BotSettingsFormProps) {
  const updateBot = useUpdateBot();
  const { success, error: showError } = useNotifications();

  const [formData, setFormData] = useState<BotUpdateInput>({
    name: bot.name,
    description: bot.description || undefined,
    system_prompt: bot.system_prompt,
    llm_provider: bot.llm_provider,
    llm_config: {
      temperature: bot.llm_config.temperature ?? 0.7,
      max_tokens: bot.llm_config.max_tokens ?? 1000,
      model_name: bot.llm_config.model_name ?? "gpt-4o",
    },
    retention_days: bot.retention_days,
  });

  // Update form when bot data changes
  useEffect(() => {
    setFormData({
      name: bot.name,
      description: bot.description || undefined,
      system_prompt: bot.system_prompt,
      llm_provider: bot.llm_provider,
      llm_config: {
        temperature: bot.llm_config.temperature ?? 0.7,
        max_tokens: bot.llm_config.max_tokens ?? 1000,
        model_name: bot.llm_config.model_name ?? "gpt-4o",
      },
      retention_days: bot.retention_days,
    });
  }, [bot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateBot.mutate(
      { botId: bot.id, input: formData },
      {
        onSuccess: () => {
          success("Bot Updated", "Bot settings have been saved successfully");
        },
        onError: (error: unknown) => {
          showError("Update Failed", "Failed to update bot. Please try again.");
          console.error("Update error:", error);
        },
      }
    );
  };

  const hasChanges = () => {
    return (
      formData.name !== bot.name ||
      formData.description !== (bot.description || undefined) ||
      formData.system_prompt !== bot.system_prompt ||
      formData.llm_provider !== bot.llm_provider ||
      formData.llm_config?.temperature !== bot.llm_config.temperature ||
      formData.llm_config?.max_tokens !== bot.llm_config.max_tokens ||
      formData.llm_config?.model_name !== bot.llm_config.model_name ||
      formData.retention_days !== bot.retention_days
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your bot's name, description, and basic settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bot Name</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="My AI Assistant"
              required
              minLength={1}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe what this bot does..."
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {(formData.description || "").length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              value={formData.system_prompt || ""}
              onChange={(e) =>
                setFormData({ ...formData, system_prompt: e.target.value })
              }
              placeholder="You are an intelligent assistant..."
              required
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This prompt defines how your bot behaves and responds
            </p>
          </div>
        </CardContent>
      </Card>

      {/* LLM Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>LLM Configuration</CardTitle>
          <CardDescription>
            Configure the language model and response parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="llm-provider">LLM Provider</Label>
            <Select
              value={formData.llm_provider}
              onValueChange={(value: LLMProvider) =>
                setFormData({ ...formData, llm_provider: value })
              }
            >
              <SelectTrigger id="llm-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={formData.llm_config?.model_name || "gpt-4o"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    llm_config: {
                      ...formData.llm_config,
                      model_name: e.target.value,
                    },
                  })
                }
                placeholder="gpt-4o"
              />
              <p className="text-xs text-muted-foreground">
                {formData.llm_provider === "openai"
                  ? "e.g., gpt-4o, gpt-4-turbo, gpt-3.5-turbo"
                  : "e.g., gemini-1.5-pro, gemini-1.5-flash"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">
                Temperature: {formData.llm_config?.temperature ?? 0.7}
              </Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={formData.llm_config?.temperature ?? 0.7}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    llm_config: {
                      ...formData.llm_config,
                      temperature: parseFloat(e.target.value) || 0.7,
                    },
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness (0.0 = focused, 2.0 = creative)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                min="1"
                max="4000"
                value={formData.llm_config?.max_tokens ?? 1000}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    llm_config: {
                      ...formData.llm_config,
                      max_tokens: parseInt(e.target.value) || 1000,
                    },
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum tokens in the response
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention-days">Retention Days</Label>
              <Input
                id="retention-days"
                type="number"
                min="1"
                max="3650"
                value={formData.retention_days ?? 90}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    retention_days: parseInt(e.target.value) || 90,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                How long to keep query logs (1-3650 days)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={!hasChanges() || updateBot.isPending}
          className="gap-2"
        >
          <Save className="h-5 w-5" />
          {updateBot.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

