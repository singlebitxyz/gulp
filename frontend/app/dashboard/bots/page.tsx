"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Bot as BotIcon, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBots, useDeleteBot } from "@/lib/query/hooks/bots";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { Bot } from "@/lib/types/bot";
import { Badge } from "@/components/ui/badge";
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

// Bot Card Component
function BotCard({ bot, onEdit, onDelete }: { bot: Bot; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BotIcon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{bot.name}</CardTitle>
              <CardDescription className="mt-1">
                {bot.description || "No description"}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{bot.llm_provider}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground line-clamp-2">
            {bot.system_prompt}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Created {new Date(bot.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
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

  const handleDeleteClick = (bot: Bot) => {
    setBotToDelete(bot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!botToDelete) return;

    deleteBot.mutate(botToDelete.id, {
      onSuccess: () => {
        success("Bot Deleted", `"${botToDelete.name}" has been deleted successfully`);
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
              {error instanceof Error ? error.message : "An unknown error occurred"}
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
          onClick={() => {
            // TODO: Open create bot modal
            console.log("Create bot clicked");
          }}
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
              onClick={() => {
                // TODO: Open create bot modal
                console.log("Create bot clicked");
              }}
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
              This will permanently delete the bot "{botToDelete?.name}". This action
              cannot be undone and will delete all associated data including sources,
              chunks, and queries.
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
    </div>
  );
}

