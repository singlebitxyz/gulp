"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, Users, MessageCircle, Clock, Target, Download, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAnalyticsOverview } from "@/lib/query/hooks/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface BotAnalyticsProps {
  botId: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// CSV export utilities
const convertToCSV = (data: any[], headers: string[]) => {
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
        return `"${value.toString().replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export default function BotAnalytics({ botId }: BotAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("30");

  // Single analytics overview query
  const { data: overview, isLoading, error } = useAnalyticsOverview(
    botId,
    parseInt(timeRange),
    10, // top queries
    20 // unanswered
  );

  const summary = overview?.summary;
  const topQueries = overview?.top_queries || [];
  const unanswered = overview?.unanswered || [];
  const usageData = overview?.usage || [];

  // Export functions
  const exportTopQueries = () => {
    if (!topQueries || topQueries.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvData = topQueries.map(query => ({
      "Query": query.query_text,
      "Frequency": query.frequency,
      "Avg Confidence": query.avg_confidence ? `${(query.avg_confidence * 100).toFixed(1)}%` : "N/A",
      "Total Tokens": query.total_tokens,
      "First Seen": new Date(query.first_seen).toLocaleDateString(),
      "Last Seen": new Date(query.last_seen).toLocaleDateString(),
    }));

    const csv = convertToCSV(csvData, ["Query", "Frequency", "Avg Confidence", "Total Tokens", "First Seen", "Last Seen"]);
    downloadCSV(csv, `top-queries-${botId}-${timeRange}days.csv`);
    toast.success("Top queries exported successfully");
  };

  const exportUnansweredQueries = () => {
    if (!unanswered || unanswered.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvData = unanswered.map(query => ({
      "Query": query.query_text,
      "Confidence": query.confidence ? `${(query.confidence * 100).toFixed(1)}%` : "N/A",
      "Sources Count": query.sources_count,
      "Response Summary": query.response_summary,
      "Created At": new Date(query.created_at).toLocaleString(),
    }));

    const csv = convertToCSV(csvData, ["Query", "Confidence", "Sources Count", "Response Summary", "Created At"]);
    downloadCSV(csv, `unanswered-queries-${botId}-${timeRange}days.csv`);
    toast.success("Unanswered queries exported successfully");
  };

  const exportUsageData = () => {
    if (!usageData || usageData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvData = usageData.map(day => ({
      "Date": day.date,
      "Query Count": day.query_count,
      "Total Tokens": day.total_tokens,
      "Avg Confidence": day.avg_confidence ? `${(day.avg_confidence * 100).toFixed(1)}%` : "N/A",
    }));

    const csv = convertToCSV(csvData, ["Date", "Query Count", "Total Tokens", "Avg Confidence"]);
    downloadCSV(csv, `usage-data-${botId}-${timeRange}days.csv`);
    toast.success("Usage data exported successfully");
  };

  const chartConfig = {
    queries: {
      label: "Queries",
      color: "oklch(0.646 0.222 41.116)",
    },
    tokens: {
      label: "Tokens",
      color: "oklch(0.6 0.118 184.704)",
    },
    confidence: {
      label: "Avg Confidence",
      color: "oklch(0.646 0.222 41.116)",
    },
  } satisfies ChartConfig;

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "N/A";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatConfidence = (confidence: number | null | undefined) => {
    if (confidence === null || confidence === undefined) return "N/A";
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const formatLatency = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Track your bot's performance, usage patterns, and user interactions
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{formatNumber(summary?.total_queries || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {summary?.unique_sessions ? `${summary.unique_sessions} unique sessions` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{formatNumber(summary?.total_tokens || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {summary?.prompt_tokens && summary?.completion_tokens
                ? `${formatNumber(summary.prompt_tokens)} prompt, ${formatNumber(summary.completion_tokens)} completion`
                : ""
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{formatConfidence(summary?.avg_confidence)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Answer quality score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{formatLatency(summary?.avg_latency_ms)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Usage Over Time Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Usage Trends</CardTitle>
                <CardDescription>
                  Query volume and token usage over time
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportUsageData}
                disabled={!usageData || usageData.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : usageData && usageData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart
                  accessibilityLayer
                  data={usageData}
                  margin={{
                    left: 12,
                    right: 12,
                    top: 12,
                    bottom: 12,
                  }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Bar
                    dataKey="query_count"
                    fill="var(--color-queries)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No usage data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confidence Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
            <CardDescription>
              Average confidence scores over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : usageData && usageData.filter(d => d.avg_confidence !== null).length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart
                  accessibilityLayer
                  data={usageData.filter(d => d.avg_confidence !== null)}
                  margin={{
                    left: 12,
                    right: 12,
                    top: 12,
                    bottom: 12,
                  }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: any) => [`${(value * 100).toFixed(1)}%`, "Confidence"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_confidence"
                    stroke="var(--color-confidence)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-confidence)", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No confidence data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Queries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Queries</CardTitle>
                <CardDescription>
                  Most frequently asked questions
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportTopQueries}
                disabled={!topQueries || topQueries.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : topQueries && topQueries.length > 0 ? (
              <div className="space-y-4">
                {topQueries.slice(0, 10).map((query, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={query.query_text}>
                        {query.query_text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {query.frequency} times • {formatConfidence(query.avg_confidence)}
                      </p>
                    </div>
                    <Badge variant="secondary">{query.frequency}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No query data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unanswered Queries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Potential Issues</CardTitle>
                <CardDescription>
                  Queries that may need attention
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportUnansweredQueries}
                disabled={!unanswered || unanswered.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            ) : unanswered && unanswered.length > 0 ? (
              <div className="space-y-4">
                {unanswered.slice(0, 5).map((query, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-sm font-medium truncate" title={query.query_text}>
                      {query.query_text}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {query.confidence !== null && (
                        <span>Confidence: {formatConfidence(query.confidence)}</span>
                      )}
                      {query.sources_count > 0 && (
                        <span>Sources: {query.sources_count}</span>
                      )}
                      <span>{new Date(query.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No issues detected
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
