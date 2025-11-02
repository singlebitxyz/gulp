"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, X, CheckCircle2, AlertCircle } from "lucide-react";
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
import { useUploadFileSource } from "@/lib/query/hooks/sources";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SourceUploadProps {
  botId: string;
}

const ALLOWED_FILE_TYPES = {
  "application/pdf": { ext: ".pdf", label: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: ".docx",
    label: "DOCX",
  },
  "text/plain": { ext: ".txt", label: "TXT" },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function SourceUpload({ botId }: SourceUploadProps) {
  const uploadMutation = useUploadFileSource(botId);
  const { error: showError } = useNotifications();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    if (file.size === 0) {
      return "File is empty";
    }

    // Check file extension
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const validExtensions = [".pdf", ".docx", ".txt"];
    if (!validExtensions.includes(ext)) {
      return `File type not allowed. Allowed types: ${validExtensions.join(", ")}`;
    }

    // Check MIME type if available
    if (file.type && !ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
      return `MIME type not allowed: ${file.type}`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      showError("Invalid File", error);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    []
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync(selectedFile);
      setSelectedFile(null);
      setUploadProgress(0);
      // Reset file input
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      // Error handled by mutation hook
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Upload File
        </CardTitle>
        <CardDescription>
          Upload PDF, DOCX, or TXT files (max 50MB) to train your bot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag and Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          } ${uploadMutation.isPending ? "opacity-50 pointer-events-none" : ""}`}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-12 w-12 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="w-full gap-2"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Upload className="h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Upload File
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <Label
                  htmlFor="file-input"
                  className="cursor-pointer text-primary hover:underline"
                >
                  Click to browse
                </Label>
                <span className="text-muted-foreground"> or drag and drop</span>
              </div>
              <p className="text-sm text-muted-foreground">
                PDF, DOCX, TXT up to 50MB
              </p>
              <Input
                id="file-input"
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* File Type Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Supported formats:</strong> PDF, DOCX, TXT. Files will be
            processed and indexed automatically after upload.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

