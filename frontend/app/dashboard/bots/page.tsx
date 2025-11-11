"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot as BotIcon,
  Calendar,
  ChevronRight,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import BotCreateDialog from "@/components/dashboard/bots/bot-create-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useBots, useDeleteBot } from "@/lib/query/hooks/bots";
import type { Bot } from "@/lib/types/bot";
import { cn } from "@/lib/utils";

// Bot Card Component
function BotCard({
  bot,
  onView,
  onEdit,
  onDelete,
}: {
  bot: Bot;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Mock stats - will be replaced with real data
  const mockStats = {
    queries: 244,
    sessions: 12,
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 cursor-pointer",
        "border border-border hover:border-primary",
        "hover:shadow-lg hover:shadow-primary/10",
        "hover:-translate-y-1 bg-card"
      )}
      onClick={onView}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "flex aspect-square size-14 items-center justify-center rounded-xl shrink-0",
                "bg-primary/10 border border-primary/20",
                "group-hover:bg-primary/20 group-hover:border-primary/30",
                "transition-all duration-300"
              )}
            >
              <BotIcon className="size-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-xl font-bold truncate">
                  {bot.name}
                </CardTitle>
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground",
                    "opacity-0 group-hover:opacity-100 group-hover:translate-x-1",
                    "transition-all duration-300"
                  )}
                />
              </div>
              <CardDescription className="line-clamp-2 text-sm">
                {bot.description || "No description provided"}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 font-semibold px-3 py-1"
          >
            {bot.llm_provider.toUpperCase()}
          </Badge>
        </div>

        {bot.system_prompt && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Sparkles className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {bot.system_prompt}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats Preview */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <MessageSquare className="size-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Queries</p>
              <p className="text-sm font-semibold">{mockStats.queries}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <Calendar className="size-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-sm font-semibold">{mockStats.sessions}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            <span>
              {new Date(bot.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-8 w-8 p-0 opacity-70 hover:opacity-100"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-8 w-8 p-0 text-destructive opacity-70 hover:opacity-100 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BotsPage() {
  const router = useRouter();
  const { data: bots, isLoading, error } = useBots();
  const deleteBot = useDeleteBot();
  const { success, error: showError } = useNotifications();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleDeleteClick = (bot: Bot) => {
    setBotToDelete(bot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!botToDelete) return;

    deleteBot.mutate(botToDelete.id, {
      onSuccess: () => {
        success(
          "Bot Deleted",
          `"${botToDelete.name}" has been deleted successfully`
        );
        setDeleteDialogOpen(false);
        setBotToDelete(null);
      },
      onError: (error: unknown) => {
        showError("Delete Failed", "Failed to delete bot. Please try again.");
        console.error("Delete error:", error);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bots</h1>
            <p className="text-muted-foreground">Manage your AI assistants</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Bots</CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "An unknown error occurred"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Retry
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
        <div>
          <h1 className="text-3xl font-bold">Bots</h1>
          <p className="text-muted-foreground">
            Manage your AI assistants and configurations
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Create Bot
        </Button>
      </div>

      {/* Bots Grid */}
      {bots && bots.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              onView={() => {
                router.push(`/dashboard/bots/${bot.id}`);
              }}
              onEdit={() => {
                router.push(`/dashboard/bots/${bot.id}/settings`);
              }}
              onDelete={() => handleDeleteClick(bot)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BotIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No bots yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Get started by creating your first AI assistant bot
            </p>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Create Your First Bot
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the bot &quot;{botToDelete?.name}
              &quot;. This action cannot be undone and will delete all
              associated data including sources, chunks, and queries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBotToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteBot.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBot.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Bot Dialog */}
      <BotCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
