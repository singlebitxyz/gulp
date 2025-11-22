"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useCreateWidgetToken } from "@/lib/query/hooks/widget-tokens";
import type { WidgetTokenCreateInput } from "@/lib/types/widget-token";

interface WidgetTokenCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botId: string;
}

export default function WidgetTokenCreateDialog({
  open,
  onOpenChange,
  botId,
}: WidgetTokenCreateDialogProps) {
  const { success, error: showError } = useNotifications();
  const createTokenMutation = useCreateWidgetToken(botId);

  const [formData, setFormData] = useState<WidgetTokenCreateInput>({
    name: "",
    allowed_domains: [],
    expires_at: undefined,
  });

  const [domainInput, setDomainInput] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [scriptTagCopied, setScriptTagCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Get API URL from environment or use default
  const apiUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  // Get widget.js URL - can be from same origin or CDN
  const widgetJsUrl =
    process.env.NEXT_PUBLIC_GULP_WIDGET_URL ||
    "http://localhost:3000/widget.js";

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        allowed_domains: [],
        expires_at: undefined,
      });
      setDomainInput("");
      setCreatedToken(null);
      setScriptTagCopied(false);
      setTokenCopied(false);
    }
  }, [open]);

  const handleAddDomain = () => {
    const trimmed = domainInput.trim();
    if (!trimmed) return;

    if (formData.allowed_domains.includes(trimmed)) {
      showError("Duplicate Domain", "This domain is already added.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      allowed_domains: [...prev.allowed_domains, trimmed],
    }));
    setDomainInput("");
  };

  const handleRemoveDomain = (domain: string) => {
    setFormData((prev) => ({
      ...prev,
      allowed_domains: prev.allowed_domains.filter((d) => d !== domain),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDomain();
    }
  };

  // Generate script tag from token
  const getScriptTag = (token: string): string => {
    return `<script
    src="${widgetJsUrl}"
    data-token="${token}"
    data-api-url="${apiUrl}"
    async
></script>`;
  };

  const handleCopyScriptTag = async () => {
    if (createdToken) {
      const scriptTag = getScriptTag(createdToken);
      await navigator.clipboard.writeText(scriptTag);
      setScriptTagCopied(true);
      setTimeout(() => setScriptTagCopied(false), 2000);
    }
  };

  const handleCopyToken = async () => {
    if (createdToken) {
      await navigator.clipboard.writeText(createdToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createTokenMutation.isPending) return;

    // Validation
    if (formData.allowed_domains.length === 0) {
      showError("Validation Error", "At least one allowed domain is required.");
      return;
    }

    // Prepare expires_at if date is provided
    let expiresAt: string | undefined = undefined;
    if (formData.expires_at) {
      expiresAt = new Date(formData.expires_at).toISOString();
    }

    try {
      const response = await createTokenMutation.mutateAsync({
        name: formData.name || undefined,
        allowed_domains: formData.allowed_domains,
        expires_at: expiresAt,
      });

      // Show the token (only shown once)
      setCreatedToken(response.token);
      success(
        "Token Created",
        "Widget token created successfully! Save it now - it won't be shown again."
      );
    } catch {
      // Error handled by mutation hook
    }
  };

  // If token was created, show script tag display
  if (createdToken) {
    const scriptTag = getScriptTag(createdToken);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Info className="h-5 w-5 text-amber-500 flex-shrink-0" />
              Widget Script Tag Ready
            </DialogTitle>
            <DialogDescription className="text-sm">
              Copy the script tag below and add it to your website. This is the
              only time you&apos;ll see the token!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                This script tag contains your token and is ready to use. Copy it
                now - you won&apos;t see the full token again!
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Copy this script tag to your website
              </Label>
              <div className="relative">
                <pre className="w-full bg-muted p-3 sm:p-4 rounded-md font-mono text-xs sm:text-sm overflow-x-auto border break-all whitespace-pre-wrap">
                  <code className="break-all">{scriptTag}</code>
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyScriptTag}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
                >
                  {scriptTagCopied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600 sm:mr-2" />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Or copy just the token
              </Label>
              <div className="relative">
                <code className="w-full bg-muted p-3 sm:p-4 rounded-md font-mono text-xs sm:text-sm overflow-x-auto border break-all block">
                  {createdToken}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToken}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
                >
                  {tokenCopied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600 sm:mr-2" />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground space-y-2">
              <p className="font-medium">
                <strong>How to use:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1.5 ml-2">
                <li>Copy the script tag above</li>
                <li>
                  Paste it before the closing{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">
                    &lt;/body&gt;
                  </code>{" "}
                  tag in your HTML
                </li>
                <li>The widget will automatically appear on your website</li>
                <li>
                  Make sure your widget.js file is accessible at the specified
                  URL
                </li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Plus className="h-5 w-5 flex-shrink-0" /> Create Widget Token
          </DialogTitle>
          <DialogDescription className="text-sm">
            Generate a token to embed your bot widget on websites.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 sm:space-y-6 py-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Token Name (Optional)</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Production Website Token"
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground text-right">
                {(formData.name || "").length}/100
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="domains">Allowed Domains</Label>
              <div className="flex gap-2">
                <Input
                  id="domains"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://example.com or example.com"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddDomain}
                  disabled={!domainInput.trim()}
                >
                  Add
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter domains where this token can be used. Press Enter or click
                Add.
              </p>
              {formData.allowed_domains.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.allowed_domains.map((domain, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {domain}
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(domain)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={
                  formData.expires_at
                    ? new Date(formData.expires_at).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expires_at: e.target.value ? e.target.value : undefined,
                  }))
                }
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty for tokens that never expire. Expired tokens will be
                automatically rejected.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={
                createTokenMutation.isPending ||
                formData.allowed_domains.length === 0
              }
            >
              {createTokenMutation.isPending ? (
                <>
                  <Plus className="h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Create Token
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
