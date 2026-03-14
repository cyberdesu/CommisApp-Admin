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
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-3">
            <Badge className="rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 border-indigo-100">
              <Sparkles className="mr-1.5 inline-block size-3.5" />
              Admin Configuration
            </Badge>

            <div className="space-y-2 max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Admin Panel Settings
              </h1>
              <p className="text-sm leading-6 text-slate-500 md:text-base">
                This page is prepared to control various preferences. Currently,
                the interface uses a minimalist and elegant design for future
                functional integration.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 w-full sm:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Module Status
            </p>
            <p className="mt-1.5 text-base font-semibold text-slate-900">
              Ready for Implementation
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {settingGroups.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4 p-6 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-slate-500 mt-1">
                  {description}
                </CardDescription>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-100 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100">
                <Icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                This module is not yet activated, but the layout and entry point are available.
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
