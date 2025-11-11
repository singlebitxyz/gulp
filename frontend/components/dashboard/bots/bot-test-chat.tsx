"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot as BotIcon,
  ChevronDown,
  ChevronUp,
  FileText,
  Link as LinkIcon,
  Send,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryBot } from "@/lib/query/hooks";
import type { Bot } from "@/lib/types/bot";

interface Citation {
  chunk_id: string;
  heading?: string;
  score?: number;
  source?: {
    source_id: string;
    source_type: string;
    original_url?: string;
    canonical_url?: string;
    storage_path?: string;
    filename?: string;
  };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  citations?: Citation[];
  confidence?: number;
}

interface BotTestChatProps {
  bot: Bot;
}

// Citation section component with collapsible sources
function CitationSection({
  citations,
  confidence,
}: {
  citations: Citation[];
  confidence?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between mb-2 hover:bg-primary/20 hover:text-primary rounded px-2 py-1 transition-colors">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              Sources ({citations.length})
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2">
            {citations.map((citation, idx) => (
              <CitationItem
                key={citation.chunk_id || idx}
                citation={citation}
                idx={idx}
              />
            ))}
            {confidence !== undefined && (
              <Badge
                variant={
                  confidence >= 0.7
                    ? "default"
                    : confidence >= 0.5
                      ? "secondary"
                      : "outline"
                }
                className="text-xs mb-2"
              >
                {Math.round(confidence * 100)}% confidence
              </Badge>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Citation component with its own state
function CitationItem({ citation, idx }: { citation: Citation; idx: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      className="border border-border/50 rounded-md"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-primary/20 hover:text-primary transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {citation.source?.source_type === "html" ? (
            <LinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          ) : (
            <FileText className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          )}
          <span className="truncate font-medium">
            {citation.heading ||
              citation.source?.filename ||
              citation.source?.original_url ||
              `Source ${idx + 1}`}
          </span>
          {citation.score !== undefined && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {Math.round(citation.score * 100)}%
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-2">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {citation.source && (
            <>
              {citation.source.source_type === "html" &&
                citation.source.original_url && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium min-w-[60px]">URL:</span>
                    <a
                      href={citation.source.original_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary hover:underline truncate"
                    >
                      {citation.source.original_url}
                    </a>
                  </div>
                )}
              {citation.source.filename && (
                <div className="flex items-start gap-2">
                  <span className="font-medium min-w-[60px]">File:</span>
                  <span className="truncate">{citation.source.filename}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[60px]">Type:</span>
                <Badge variant="outline" className="text-[10px]">
                  {citation.source.source_type.toUpperCase()}
                </Badge>
              </div>
            </>
          )}
          {citation.heading && (
            <div className="flex items-start gap-2">
              <span className="font-medium min-w-[60px]">Heading:</span>
              <span className="truncate">{citation.heading}</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function BotTestChat({ bot }: BotTestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const queryMutation = useQueryBot(bot.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const res = await queryMutation.mutateAsync({
          query_text: userMessage.content,
          top_k: 5,
          min_score: 0.25,
          session_id: "dashboard-test",
          page_url:
            typeof window !== "undefined" ? window.location.href : undefined,
          include_metadata: true, // Enable metadata for testing/debugging
        });
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.answer,
          timestamp: new Date(),
          citations: res.citations,
          confidence: res.confidence,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (err) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't process that query. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, bot.id]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(e as any);
      }
    },
    [handleSend]
  );

  return (
    <Card className="h-[calc(100vh-350px)]">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BotIcon className="h-5 w-5" />
              Test Chat
            </CardTitle>
            <CardDescription>
              Chat with your bot to test its responses
            </CardDescription>
          </div>
          <Badge variant="outline">{bot.llm_provider}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-100px)] p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <BotIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start Testing</h3>
                <p className="text-muted-foreground max-w-md">
                  Send a message to test how your bot responds. This will use
                  the current system prompt and LLM configuration.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex w-full ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-3 max-w-[80%] ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback
                          className={
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }
                        >
                          {message.role === "user" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <BotIcon className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <div className="space-y-3">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: ({ node, ...props }) => (
                                    <a
                                      {...props}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      className="underline"
                                    />
                                  ),
                                  code: ({
                                    inline,
                                    className,
                                    children,
                                    ...props
                                  }) => (
                                    <code
                                      className={
                                        "rounded bg-background/50 px-1 py-0.5 text-[0.85em] " +
                                        (className || "")
                                      }
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  ),
                                  pre: ({ children }) => (
                                    <pre className="overflow-auto rounded bg-background/50 p-3 text-sm">
                                      {children}
                                    </pre>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc pl-5 space-y-1">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal pl-5 space-y-1">
                                      {children}
                                    </ol>
                                  ),
                                  h1: ({ children }) => (
                                    <h1 className="text-lg font-semibold">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-base font-semibold">
                                      {children}
                                    </h2>
                                  ),
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>

                            {/* Citations with Source Info */}
                            {message.citations &&
                              message.citations.length > 0 && (
                                <CitationSection
                                  citations={message.citations}
                                  confidence={message.confidence}
                                />
                              )}
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        )}
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted">
                      <BotIcon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200"></div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-background">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
