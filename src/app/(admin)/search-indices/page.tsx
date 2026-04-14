import { SearchCheck, Sparkles } from "lucide-react";

import { ReindexPanel } from "@/components/admin/reindex-panel";
import { Badge } from "@/components/ui/badge";

export default function SearchIndicesPage() {
  return (
    <div className="space-y-6">
      <section className="bg-admin-surface overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-3">
            <Badge className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 border-primary/20">
              <Sparkles className="mr-1.5 inline-block size-3.5" />
              Ops Tooling
            </Badge>

            <div className="space-y-2 max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Search Indices
              </h1>
              <p className="text-sm leading-6 text-muted-foreground md:text-base">
                Rebuild Elasticsearch indices from Postgres. Use after initial
                setup, a mapping change, or to repair drift if the incremental
                sync fell behind.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-secondary/45 p-4 w-full sm:w-auto flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <SearchCheck className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Cold Path
              </p>
              <p className="mt-1.5 text-base font-semibold text-foreground">
                Manual Rebuild
              </p>
            </div>
          </div>
        </div>
      </section>

      <ReindexPanel />
    </div>
  );
}
