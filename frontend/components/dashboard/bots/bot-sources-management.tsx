"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SourceUpload from "./source-upload";
import SourceUrlForm from "./source-url-form";
import SourceList from "./source-list";

interface BotSourcesManagementProps {
  botId: string;
}

export default function BotSourcesManagement({
  botId,
}: BotSourcesManagementProps) {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Source Management</CardTitle>
          </div>
          <CardDescription>
            Upload files or add URLs to train your bot with knowledge. Files
            will be automatically parsed and indexed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="url">Add URL</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-4">
              <SourceUpload botId={botId} />
            </TabsContent>
            <TabsContent value="url" className="mt-4">
              <SourceUrlForm botId={botId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources</CardTitle>
          <CardDescription>
            View and manage all sources for this bot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SourceList botId={botId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Sources Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p>
              <strong>1. Upload Files</strong>
            </p>
            <p className="text-muted-foreground">
              Upload PDF, DOCX, or TXT files. Files are automatically processed,
              parsed, and indexed for your bot to use in responses.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <strong>2. Add URLs</strong>
            </p>
            <p className="text-muted-foreground">
              Submit website URLs to crawl and index. The content will be
              extracted and made available to your bot.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <strong>3. Processing Status</strong>
            </p>
            <p className="text-muted-foreground">
              Sources go through these stages: Uploaded → Parsing → Indexed.
              Once indexed, the content is ready for your bot to use.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <strong>4. Delete Sources</strong>
            </p>
            <p className="text-muted-foreground">
              You can delete sources at any time. Deleting a source removes all
              associated chunks and embeddings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

