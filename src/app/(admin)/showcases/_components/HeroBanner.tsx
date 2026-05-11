import { Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function HeroBanner({ loadedCount }: { loadedCount: number }) {
  return (
    <section className="bg-admin-surface overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
        <div className="space-y-3">
          <Badge className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 border-primary/20">
            <ImageIcon className="mr-1.5 inline-block size-3.5" />
            Content Moderation
          </Badge>

          <div className="max-w-2xl space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Showcases Directory
            </h1>
            <p className="text-sm leading-6 text-muted-foreground md:text-base">
              Kelola dan pantau semua portofolio kreatif yang diunggah oleh
              artist. Cari berdasarkan judul, verifikasi status karya, dan
              awasi tren engagement.
            </p>
          </div>
        </div>

        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-secondary/45 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Loaded Works
            </p>
            <p className="mt-1.5 text-xl font-bold text-foreground">
              {loadedCount}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/45 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Data Source
            </p>
            <p className="mt-1.5 text-xl font-bold text-foreground">
              Prisma DB
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
