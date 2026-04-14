"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from "lucide-react";
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

type DeleteResult = { deleted: boolean };
type DeleteResponse = {
  data: {
    services: DeleteResult;
    showcases: DeleteResult;
    profiles: DeleteResult;
    durationMs: number;
  };
};

type PanelState =
  | { mode: "reindex"; data: ReindexResponse["data"] }
  | { mode: "delete"; data: DeleteResponse["data"] }
  | null;

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
  const [isReindexing, setIsReindexing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<PanelState>(null);

  function getIndexStatus(key: (typeof INDICES)[number]["key"]): string {
    if (!result) return "—";

    if (result.mode === "reindex") {
      const stats = result.data[key];
      return `${stats.indexed}/${stats.total}`;
    }

    return result.data[key].deleted ? "Deleted" : "Missing";
  }

  async function handleReindex() {
    if (isReindexing || isDeleting) return;
    const confirmed = window.confirm(
      "Rebuild all Elasticsearch indices from Postgres? This may take a few minutes on large datasets and will temporarily increase load.",
    );
    if (!confirmed) return;

    setIsReindexing(true);
    setResult(null);

    try {
      const { data } = await apiClient.post<ReindexResponse>(
        "/admin/search/reindex",
      );
      setResult({ mode: "reindex", data: data.data });
      toast.success("Reindex completed", {
        description: `Finished in ${Math.round(data.data.durationMs / 1000)}s`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      toast.error("Reindex failed", { description: message });
    } finally {
      setIsReindexing(false);
    }
  }

  async function handleDeleteIndices() {
    if (isReindexing || isDeleting) return;
    const confirmed = window.confirm(
      "Delete all Elasticsearch search indices? Search and autocomplete will return empty results until you rebuild them again.",
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setResult(null);

    try {
      const { data } = await apiClient.post<DeleteResponse>(
        "/admin/search/delete",
      );
      setResult({ mode: "delete", data: data.data });
      toast.success("Indices deleted", {
        description: `Finished in ${Math.round(data.data.durationMs / 1000)}s`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      toast.error("Delete indices failed", { description: message });
    } finally {
      setIsDeleting(false);
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
            return (
              <div
                key={idx.key}
                className="rounded-xl border border-border/70 bg-secondary/45 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {idx.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {getIndexStatus(idx.key)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {idx.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleReindex}
              disabled={isReindexing || isDeleting}
              className="sm:w-auto"
            >
              {isReindexing ? (
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
            <Button
              onClick={handleDeleteIndices}
              disabled={isReindexing || isDeleting}
              variant="destructive"
              className="sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Delete All Indices
                </>
              )}
            </Button>
          </div>
          {result && (
            <p className="text-xs text-muted-foreground">
              Last {result.mode === "reindex" ? "reindex" : "delete"} run:{" "}
              {Math.round(result.data.durationMs / 1000)}s
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
