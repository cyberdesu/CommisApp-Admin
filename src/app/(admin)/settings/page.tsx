import { BellRing, LockKeyhole, Palette, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const settingGroups = [
  {
    title: "Appearance",
    description:
      "Manage admin panel themes, branding, and interface display preferences.",
    icon: Palette,
  },
  {
    title: "Notifications",
    description:
      "Configure email notifications, order updates, and important system activities.",
    icon: BellRing,
  },
  {
    title: "Security",
    description:
      "Configure admin access, authentication, and dashboard account protection.",
    icon: ShieldCheck,
  },
  {
    title: "Access Control",
    description:
      "Manage roles, permissions, and usage policies for internal teams.",
    icon: LockKeyhole,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="bg-admin-surface overflow-hidden rounded-2xl border border-border shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-3">
            <Badge className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 border-primary/20">
              <Sparkles className="mr-1.5 inline-block size-3.5" />
              Admin Configuration
            </Badge>

            <div className="space-y-2 max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Admin Panel Settings
              </h1>
              <p className="text-sm leading-6 text-muted-foreground md:text-base">
                This page is prepared to control various preferences. Currently,
                the interface uses a minimalist and elegant design for future
                functional integration.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-secondary/45 p-4 w-full sm:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Module Status
            </p>
            <p className="mt-1.5 text-base font-semibold text-foreground">
              Ready for Implementation
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {settingGroups.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-border hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4 p-6 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-muted-foreground mt-1">
                  {description}
                </CardDescription>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/45 text-muted-foreground border border-border/70 transition-colors group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20">
                <Icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <div className="rounded-xl border border-border/70 bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">
                This module is not yet activated, but the layout and entry point are available.
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
