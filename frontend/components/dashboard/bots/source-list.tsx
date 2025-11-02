"use client";

import { useState } from "react";
import {
  FileText,
  Globe,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useSources, useDeleteSource } from "@/lib/query/hooks/sources";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { Source } from "@/lib/types/source";
import { formatDistanceToNow } from "date-fns";

interface SourceListProps {
  botId: string;
}

// Status Badge Component
function StatusBadge({ status }: { status: Source["status"] }) {
  const statusConfig = {
    uploaded: {
      label: "Uploaded",
      variant: "default" as const,
      icon: FileText,
    },
    parsing: {
      label: "Parsing",
      variant: "secondary" as const,
      icon: Loader2,
    },
    indexed: {
      label: "Indexed",
      variant: "default" as const,
      icon: CheckCircle2,
      className: "bg-green-500/10 text-green-700 dark:text-green-400",
    },
    failed: {
      label: "Failed",
      variant: "destructive" as const,
      icon: XCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1 ${config.className || ""} ${
        status === "parsing" ? "animate-pulse" : ""
      }`}
    >
      <Icon className={`h-3 w-3 ${status === "parsing" ? "animate-spin" : ""}`} />
      {config.label}
    </Badge>
  );
}

// Source Item Component
function SourceItem({
  source,
  onDelete,
  isDeleting,
}: {
  source: Source;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const isUrlSource = source.source_type === "html";
  const displayName = isUrlSource
    ? source.original_url || source.canonical_url || "URL"
    : source.storage_path.split("/").pop() || "File";

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-1">
              {isUrlSource ? (
                <Globe className="h-5 w-5 text-blue-500" />
              ) : (
                <FileText className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{displayName}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={source.status} />
                <Badge variant="outline" className="text-xs">
                  {source.source_type.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {source.error_message && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {source.error_message}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div>
            {source.file_size && (
              <span className="mr-3">{formatFileSize(source.file_size)}</span>
            )}
            {isUrlSource && source.canonical_url && (
              <a
                href={source.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {source.canonical_url}
              </a>
            )}
          </div>
          <div>
            Added{" "}
            {formatDistanceToNow(new Date(source.created_at), {
              addSuffix: true,
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SourceList({ botId }: SourceListProps) {
  const { data: sources, isLoading, error } = useSources(botId);
  const deleteSource = useDeleteSource(botId);
  const { success, error: showError } = useNotifications();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<Source | null>(null);

  const handleDeleteClick = (source: Source) => {
    setSourceToDelete(source);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!sourceToDelete) return;

    deleteSource.mutate(sourceToDelete.id, {
      onSuccess: () => {
        const displayName =
          sourceToDelete.source_type === "html"
            ? sourceToDelete.original_url || sourceToDelete.canonical_url || "URL"
            : sourceToDelete.storage_path.split("/").pop() || "File";
        success("Source Deleted", `"${displayName}" has been deleted`);
        setDeleteDialogOpen(false);
        setSourceToDelete(null);
      },
      onError: (error: unknown) => {
        showError("Delete Failed", "Failed to delete source. Please try again.");
        console.error("Delete error:", error);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Sources
          </CardTitle>
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
    );
  }

  return (
    <div className="space-y-4">
      {sources && sources.length > 0 ? (
        <div className="space-y-4">
          {sources.map((source) => (
            <SourceItem
              key={source.id}
              source={source}
              onDelete={() => handleDeleteClick(source)}
              isDeleting={deleteSource.isPending}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sources yet</h3>
            <p className="text-muted-foreground text-center text-sm">
              Upload files or add URLs to train your bot with knowledge
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the source{" "}
              {sourceToDelete?.source_type === "html"
                ? `"${sourceToDelete?.original_url || sourceToDelete?.canonical_url}"`
                : `"${sourceToDelete?.storage_path.split("/").pop()}"`}
              . This action cannot be undone and will delete all associated
              chunks and embeddings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSourceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteSource.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSource.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

