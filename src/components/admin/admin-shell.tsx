"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Image as ImageIcon,
} from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  children: React.ReactNode;
};

const menus = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview & performance",
    icon: LayoutDashboard,
  },
  {
    href: "/users",
    label: "Users",
    description: "Manage team access",
    icon: Users,
  },
  {
    href: "/showcases",
    label: "Showcases",
    description: "Manage app showcases",
    icon: ImageIcon,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Control preferences",
    icon: Settings,
  },
];

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "Dashboard Overview";
  if (pathname.startsWith("/users")) return "Users Management";
  if (pathname.startsWith("/showcases")) return "Showcases Management";
  if (pathname.startsWith("/settings")) return "System Settings";

  return "Admin Panel";
}

function SidebarContent({
  pathname,
  mobile = false,
}: {
  pathname: string;
  mobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col",
        mobile ? "bg-slate-950 text-slate-100" : "bg-slate-950 text-slate-100",
      )}
    >
      <div className="border-b border-white/5 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
              CommisApp
            </p>
            <h2 className="truncate text-sm font-semibold text-white">
              Admin Console
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Workspace
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                Main Platform
              </p>
            </div>
            <Badge className="border border-emerald-400/20 bg-emerald-500/10 px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-400 hover:bg-emerald-500/10">
              Live
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <div className="mb-4 px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
            Overview
          </p>
        </div>

        <nav className="space-y-1">
          {menus.map(({ href, label, description, icon: Icon }) => {
            const isActive =
              pathname === href || (href !== "/" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                <div className="flex shrink-0 items-center justify-center">
                  <Icon className={cn("size-5", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        isActive ? "text-indigo-300" : "text-slate-300",
                      )}
                    >
                      {label}
                    </span>
                    {isActive && (
                      <ChevronRight className="size-4 shrink-0 text-indigo-400 opacity-70" />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/5 p-4">
        <LogoutButton />
      </div>
    </div>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-black">
      <div className="flex min-h-screen">
        <aside className="hidden w-[300px] shrink-0 border-r border-black/10 bg-black lg:flex lg:flex-col">
          <SidebarContent pathname={pathname} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
            <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Sheet>
                  <SheetTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl border-black/10 bg-white text-black shadow-none lg:hidden"
                      />
                    }
                  >
                    <Menu className="size-5" />
                    <span className="sr-only">Open navigation</span>
                  </SheetTrigger>

                  <SheetContent
                    side="left"
                    className="w-[88vw] max-w-[320px] border-r-0 bg-black p-0 text-white"
                    showCloseButton={true}
                  >
                    <SheetHeader className="sr-only">
                      <SheetTitle>Admin Navigation</SheetTitle>
                      <SheetDescription>
                        Navigate between dashboard sections.
                      </SheetDescription>
                    </SheetHeader>
                    <SidebarContent pathname={pathname} mobile />
                  </SheetContent>
                </Sheet>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-orange-500">
                    Admin Panel
                  </p>
                  <h1 className="truncate text-xl font-semibold tracking-tight text-black">
                    {pageTitle}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 sm:flex">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-orange-500" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-600">
                    System Active
                  </span>
                </div>

                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-black transition hover:border-orange-500/30 hover:text-orange-500"
                >
                  <Bell className="size-5" />
                  <span className="sr-only">Notifications</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
