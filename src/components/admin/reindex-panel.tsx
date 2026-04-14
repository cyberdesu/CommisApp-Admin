"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";

type IndexResult = { indexed: number; total: number };
type ReindexResponse = {
  data: {
    services: IndexResult;
    showcases: IndexResult;
    profiles: IndexResult;
    durationMs: number;
  };
};

const INDICES: {
  key: "services" | "showcases" | "profiles";
  label: string;
  description: string;
}[] = [
  {
    key: "services",
    label: "Services",
    description: "Commission listings shown on search & discover.",
  },
  {
    key: "showcases",
    label: "Showcases",
    description: "Portfolio items that power the grid feed.",
  },
  {
    key: "profiles",
    label: "Profiles",
    description: "Verified artist profiles available for discovery.",
  },
];

export function ReindexPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ReindexResponse["data"] | null>(null);

  async function handleReindex() {
    if (isRunning) return;
    const confirmed = window.confirm(
      "Rebuild all Elasticsearch indices from Postgres? This may take a few minutes on large datasets and will temporarily increase load.",
    );
    if (!confirmed) return;

    setIsRunning(true);
    setResult(null);

    try {
      const { data } = await apiClient.post<ReindexResponse>(
        "/admin/search/reindex",
      );
      setResult(data.data);
      toast.success("Reindex completed", {
        description: `Finished in ${Math.round(data.data.durationMs / 1000)}s`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      toast.error("Reindex failed", { description: message });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="gap-1">
        <CardTitle className="text-xl font-bold tracking-tight">
          Full Reindex
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Reads every eligible row from Postgres and pushes it into
          Elasticsearch. Existing documents with the same id are overwritten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/5 p-4 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">
                Heavy operation — use sparingly.
              </p>
              <p className="text-amber-100/80">
                Incremental sync already runs on every create/update/delete,
                so you only need this for bootstrap, drift recovery, or after
                a mapping change.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {INDICES.map((idx) => {
            const r = result?.[idx.key];
            return (
              <div
                key={idx.key}
                className="rounded-xl border border-border/70 bg-secondary/45 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {idx.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {r ? `${r.indexed}/${r.total}` : "—"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {idx.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onClick={handleReindex}
            disabled={isRunning}
            className="sm:w-auto"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Reindexing…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" />
                Rebuild All Indices
              </>
            )}
          </Button>
          {result && (
            <p className="text-xs text-muted-foreground">
              Last run: {Math.round(result.durationMs / 1000)}s
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
