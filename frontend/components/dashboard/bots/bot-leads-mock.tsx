"use client";

import { useState, useMemo } from "react";
import {
  Download,
  Mail,
  Search,
  User,
  Building2,
  Calendar,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";

/** Mock lead shape matching CALENDAR_LEADS_INTEGRATION_PLAN leads table */
interface MockLead {
  id: string;
  visitor_email: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  company_name: string | null;
  source_url: string | null;
  conversation_summary: string | null;
  interest_level: "high" | "medium" | "low" | null;
  created_at: string;
}

const MOCK_LEADS: MockLead[] = [
  {
    id: "lead-1",
    visitor_email: "sarah.johnson@acme.com",
    visitor_name: "Sarah Johnson",
    visitor_phone: "+1 (555) 123-4567",
    company_name: "Acme Corp",
    source_url: "https://example.com/pricing",
    conversation_summary: "Interested in enterprise plan and API access.",
    interest_level: "high",
    created_at: "2026-01-28T14:32:00Z",
  },
  {
    id: "lead-2",
    visitor_email: "john@startup.io",
    visitor_name: "John Smith",
    visitor_phone: null,
    company_name: "Startup.io",
    source_url: "https://example.com",
    conversation_summary: "Asked about pricing and demo scheduling.",
    interest_level: "medium",
    created_at: "2026-01-27T09:15:00Z",
  },
  {
    id: "lead-3",
    visitor_email: "maria@design.co",
    visitor_name: "Maria Garcia",
    visitor_phone: "+1 (555) 987-6543",
    company_name: null,
    source_url: "https://example.com/features",
    conversation_summary: "Wanted to know about integrations.",
    interest_level: "low",
    created_at: "2026-01-26T16:45:00Z",
  },
  {
    id: "lead-4",
    visitor_email: "alex@tech.com",
    visitor_name: "Alex Chen",
    visitor_phone: null,
    company_name: "Tech Solutions",
    source_url: "https://example.com",
    conversation_summary: "Requested demo and asked for calendar availability.",
    interest_level: "high",
    created_at: "2026-01-25T11:20:00Z",
  },
];

function interestColor(level: MockLead["interest_level"]) {
  switch (level) {
    case "high":
      return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "medium":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "low":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/**
 * Mock Leads dashboard for video/demo recording.
 * Mirrors CALENDAR_LEADS_INTEGRATION_PLAN: Dashboard → Bots → Leads tab.
 * No real API — uses static mock data.
 */
export default function BotLeadsMock() {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<MockLead | null>(null);
  const [leads, setLeads] = useState<MockLead[]>(MOCK_LEADS);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.visitor_email.toLowerCase().includes(q) ||
        (l.visitor_name?.toLowerCase().includes(q) ?? false) ||
        (l.company_name?.toLowerCase().includes(q) ?? false)
    );
  }, [leads, search]);

  const exportCSV = () => {
    const headers = [
      "Email",
      "Name",
      "Phone",
      "Company",
      "Source URL",
      "Summary",
      "Interest",
      "Created",
    ];
    const rows = filteredLeads.map((l) => [
      l.visitor_email,
      l.visitor_name ?? "",
      l.visitor_phone ?? "",
      l.company_name ?? "",
      l.source_url ?? "",
      (l.conversation_summary ?? "").replace(/"/g, '""'),
      l.interest_level ?? "",
      new Date(l.created_at).toISOString(),
    ]);
    const csv =
      headers.join(",") +
      "\n" +
      rows.map((r) => r.map((c) => (c.includes(",") ? `"${c}"` : c)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Leads exported", { description: "CSV downloaded." });
  };

  const handleDelete = (lead: MockLead) => {
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    setSelectedLead(null);
    toast.info("Lead removed", { description: "Demo only — no data was deleted." });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
        <strong>Demo / Mock UI</strong> — For video recording. Uses static mock
        data; no API calls.
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Captured Leads</CardTitle>
              <CardDescription>
                Leads captured through bot conversations. Filter, search, and
                export.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="w-full rounded-md border">
            <div className="min-w-[640px]">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_80px_100px] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground md:grid-cols-[1fr_1fr_1fr_100px_80px]">
                <div>Contact</div>
                <div className="hidden md:block">Company</div>
                <div>Interest</div>
                <div>Date</div>
                <div className="w-8" />
              </div>
              {filteredLeads.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No leads match your search.
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="grid grid-cols-[1fr_1fr_80px_100px] gap-4 border-b px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_1fr_100px_80px]"
                  >
                    <div>
                      <p className="font-medium">{lead.visitor_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.visitor_email}
                      </p>
                    </div>
                    <div className="hidden truncate text-muted-foreground md:block">
                      {lead.company_name ?? "—"}
                    </div>
                    <div>
                      <Badge
                        variant="secondary"
                        className={interestColor(lead.interest_level)}
                      >
                        {lead.interest_level ?? "—"}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(lead)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Lead detail modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead details</DialogTitle>
            <DialogDescription>
              Information captured from the conversation
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedLead.visitor_email}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{selectedLead.visitor_name ?? "—"}</span>
              </div>
              {selectedLead.visitor_phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{selectedLead.visitor_phone}</span>
                </div>
              )}
              {selectedLead.company_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedLead.company_name}</span>
                </div>
              )}
              {selectedLead.source_url && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={selectedLead.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    {selectedLead.source_url}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(selectedLead.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <Badge
                variant="secondary"
                className={interestColor(selectedLead.interest_level)}
              >
                {selectedLead.interest_level ?? "—"}
              </Badge>
              {selectedLead.conversation_summary && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Conversation summary
                  </p>
                  <p className="mt-1 text-sm">
                    {selectedLead.conversation_summary}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
