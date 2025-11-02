"use client";

import { useState } from "react";
import { Globe, Plus } from "lucide-react";
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
import { useCreateUrlSource } from "@/lib/query/hooks/sources";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { SourceCreateInput } from "@/lib/types/source";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface SourceUrlFormProps {
  botId: string;
}

export default function SourceUrlForm({ botId }: SourceUrlFormProps) {
  const createUrlMutation = useCreateUrlSource(botId);
  const { error: showError } = useNotifications();
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateUrl = (urlString: string): string | null => {
    if (!urlString.trim()) {
      return "URL cannot be empty";
    }

    try {
      const urlObj = new URL(urlString);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return "URL must start with http:// or https://";
      }
    } catch {
      return "Invalid URL format";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || createUrlMutation.isPending) return;

    const error = validateUrl(url);
    if (error) {
      showError("Invalid URL", error);
      return;
    }

    setIsSubmitting(true);
    try {
      const sourceData: SourceCreateInput = {
        source_type: "html",
        original_url: url.trim(),
      };

      await createUrlMutation.mutateAsync(sourceData);
      setUrl(""); // Clear form on success
    } catch (err) {
      // Error handled by mutation hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Add URL Source
        </CardTitle>
        <CardDescription>
          Submit a URL to crawl and index its content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="url">Website URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/page"
                required
                disabled={createUrlMutation.isPending || isSubmitting}
              />
              <Button
                type="submit"
                disabled={!url.trim() || createUrlMutation.isPending || isSubmitting}
                className="gap-2"
              >
                {createUrlMutation.isPending || isSubmitting ? (
                  <>
                    <Plus className="h-4 w-4 animate-spin" /> Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Add URL
                  </>
                )}
              </Button>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              The URL will be crawled and its content will be indexed for your
              bot. Make sure the website allows crawling and is accessible.
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  );
}

