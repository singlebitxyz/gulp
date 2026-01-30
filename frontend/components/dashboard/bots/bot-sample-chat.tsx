"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot as BotIcon, Send, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Bot } from "@/lib/types/bot";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type FlowType = "calendar" | "lead" | null;
type CalendarStep = "email" | "time" | "done";
type LeadStep = "email" | "name" | "done";

/** Context we carry through the conversation for confirmations */
export interface FlowContext {
  calendarEmail: string | null;
  leadEmail: string | null;
  leadName: string | null;
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function looksLikeName(s: string): boolean {
  const t = s.trim();
  return t.length >= 2 && t.length <= 80 && !t.includes("@");
}

function capitalizeName(str: string): string {
  const part = str.split("@")[0].split(".")[0].trim();
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

/** Format a time string for confirmation (echo or default) */
function formatMeetingTime(userInput: string): string {
  const lower = userInput.trim().toLowerCase();
  if (/tomorrow|tuesday|wednesday|next week|2pm|2 pm|14:00|14:00/.test(lower)) {
    return "Tuesday, February 4 at 2:00 PM";
  }
  return "Tuesday, February 4 at 2:00 PM";
}

function getSampleResponse(
  userMessage: string,
  flow: FlowType,
  calendarStep: CalendarStep,
  leadStep: LeadStep,
  ctx: FlowContext
): {
  content: string;
  nextFlow: FlowType;
  nextCalendarStep: CalendarStep;
  nextLeadStep: LeadStep;
  nextContext: FlowContext;
} {
  const msg = userMessage.trim();
  const msgLower = msg.toLowerCase();
  const nextContext = { ...ctx };

  // —— Calendar flow ——
  if (flow === "calendar") {
    if (calendarStep === "email") {
      if (looksLikeEmail(userMessage)) {
        nextContext.calendarEmail = userMessage.trim();
        const name = capitalizeName(userMessage);
        return {
          content: `Thank you, ${name}. I’ve checked availability—when would you like your demo? For example, “Tuesday afternoon” or “this week.”`,
          nextFlow: "calendar",
          nextCalendarStep: "time",
          nextLeadStep: leadStep,
          nextContext,
        };
      }
      return {
        content: "To send your calendar invite we’ll need a valid email address. Could you share it?",
        nextFlow: "calendar",
        nextCalendarStep: "email",
        nextLeadStep: leadStep,
        nextContext,
      };
    }
    if (calendarStep === "time") {
      const timeStr = formatMeetingTime(userMessage);
      const email = ctx.calendarEmail || "your email";
      return {
        content: `Your demo is confirmed for **${timeStr}**. We’ll send a calendar invite to ${email} shortly. If you need to reschedule, reply here or use the link in the invite.`,
        nextFlow: "calendar",
        nextCalendarStep: "done",
        nextLeadStep: leadStep,
        nextContext,
      };
    }
  }

  // —— Lead flow ——
  if (flow === "lead") {
    if (leadStep === "email") {
      if (looksLikeEmail(userMessage)) {
        nextContext.leadEmail = userMessage.trim();
        const name = capitalizeName(userMessage);
        return {
          content: `Thanks, ${name}. What’s the best name to use for you?`,
          nextFlow: "lead",
          nextCalendarStep: calendarStep,
          nextLeadStep: "name",
          nextContext,
        };
      }
      return {
        content: "We’ll use your email to follow up. Please enter a valid address (e.g. name@company.com).",
        nextFlow: "lead",
        nextCalendarStep: calendarStep,
        nextLeadStep: "email",
        nextContext,
      };
    }
    if (leadStep === "name") {
      if (looksLikeName(userMessage)) {
        nextContext.leadName = userMessage.trim();
        const name = userMessage.trim();
        return {
          content: `We’ve saved your details, ${name}. Our team may reach out soon. Would you like to **schedule a call** to go deeper, or have any questions right now?`,
          nextFlow: "lead",
          nextCalendarStep: calendarStep,
          nextLeadStep: "done",
          nextContext,
        };
      }
      return {
        content: "Could you share the name you’d like us to use? (e.g. first and last name)",
        nextFlow: "lead",
        nextCalendarStep: calendarStep,
        nextLeadStep: "name",
        nextContext,
      };
    }
  }

  // —— Start new flow from intent ——
  if (/schedule|demo|appointment|book|meeting|call|talk/.test(msgLower)) {
    return {
      content: "We’d be glad to set that up. What email should we use for the calendar invite?",
      nextFlow: "calendar",
      nextCalendarStep: "email",
      nextLeadStep: leadStep,
      nextContext,
    };
  }
  if (/interested|learn more|information|info|curious|tell me|pricing|plans/.test(msgLower)) {
    return {
      content: "We’d be happy to help. To send you the right information and follow up, what’s your email address?",
      nextFlow: "lead",
      nextCalendarStep: calendarStep,
      nextLeadStep: "email",
      nextContext,
    };
  }

  // —— Fallback: helpful, not “demo” ——
  return {
    content: "I can help you **schedule a demo** or **get more information**—just say which you’d prefer, or ask something else.",
    nextFlow: null,
    nextCalendarStep: calendarStep,
    nextLeadStep: leadStep,
    nextContext,
  };
}

interface BotSampleChatProps {
  bot: Bot;
}

/**
 * Sample chatbot for video/demo recording.
 * Pre-scripted responses only (calendar + lead flows from CALENDAR_LEADS_INTEGRATION_PLAN).
 * No API or LLM calls.
 */
const initialContext: FlowContext = {
  calendarEmail: null,
  leadEmail: null,
  leadName: null,
};

export default function BotSampleChat({ bot }: BotSampleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [flow, setFlow] = useState<FlowType>(null);
  const [calendarStep, setCalendarStep] = useState<CalendarStep>("email");
  const [leadStep, setLeadStep] = useState<LeadStep>("email");
  const [flowContext, setFlowContext] = useState<FlowContext>(initialContext);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      const { content, nextFlow, nextCalendarStep, nextLeadStep, nextContext } =
        getSampleResponse(input, flow, calendarStep, leadStep, flowContext);
      setFlow(nextFlow);
      setCalendarStep(nextCalendarStep);
      setLeadStep(nextLeadStep);
      setFlowContext(nextContext);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    [input, flow, calendarStep, leadStep, flowContext]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(e as unknown as React.FormEvent);
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
              Sample Chat
            </CardTitle>
            <CardDescription>
              See how the bot handles scheduling and lead capture. Pre-scripted
              responses for demo.
            </CardDescription>
          </div>
          <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            Demo
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-100px)] p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <h3 className="text-lg font-semibold mb-1">How can we help?</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                  Ask to schedule a demo or get more information—we’ll walk you
                  through it.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="font-normal"
                    onClick={() => setInput("I'd like to schedule a demo")}
                  >
                    Schedule a demo
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="font-normal"
                    onClick={() =>
                      setInput("I'm interested in learning more")
                    }
                  >
                    Get more information
                  </Button>
                </div>
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
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ ...props }) => (
                                  <a
                                    {...props}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="underline"
                                  />
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold">
                                    {children}
                                  </strong>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-5 space-y-1">
                                    {children}
                                  </ul>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
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
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4 bg-background">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message…"
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
