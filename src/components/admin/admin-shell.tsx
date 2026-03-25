"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronRight,
  LayoutDashboard,
  BadgeCheck,
  Menu,
  Settings,
  ShieldCheck,
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
import { apiClient } from "@/lib/api/client";
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
    href: "/artist-requests",
    label: "Artist Requests",
    description: "Review artist verification",
    icon: BadgeCheck,
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
  if (pathname.startsWith("/artist-requests")) return "Artist Verification";
  if (pathname.startsWith("/settings")) return "System Settings";

  return "Admin Panel";
}

type ArtistRequestsMetaResponse = {
  meta?: {
    total?: number;
  };
};

function SidebarContent({
  pathname,
  pendingArtistRequests,
}: {
  pathname: string;
  pendingArtistRequests: number;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border/60 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              CommisApp
            </p>
            <h2 className="truncate text-sm font-semibold text-sidebar-foreground">
              Admin Console
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/60">
                Workspace
              </p>
              <p className="mt-1 text-sm font-semibold text-sidebar-foreground">
                Main Platform
              </p>
            </div>
            <Badge className="border border-primary/30 bg-primary/10 px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-primary hover:bg-primary/15">
              Live
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <div className="mb-4 px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/60">
            Overview
          </p>
        </div>

        <nav className="space-y-1">
          {menus.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || (href !== "/" && pathname.startsWith(href));
            const showPendingBadge =
              href === "/artist-requests" && pendingArtistRequests > 0;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground",
                )}
              >
                <div className="flex shrink-0 items-center justify-center">
                  <Icon className={cn("size-5", isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        isActive ? "text-primary" : "text-sidebar-foreground/90",
                      )}
                    >
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      {showPendingBadge && (
                        <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {pendingArtistRequests}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="size-4 shrink-0 text-primary opacity-80" />
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border/60 p-4">
        <LogoutButton />
      </div>
    </div>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const artistRequestsMetaQuery = useQuery({
    queryKey: ["artist-requests-pending-meta"],
    queryFn: async () => {
      const response = await apiClient.get<ArtistRequestsMetaResponse>(
        "/artist-requests",
        {
          params: {
            status: "PENDING",
            page: 1,
            limit: 1,
          },
        },
      );
      return response.data;
    },
    refetchInterval: 30_000,
  });

  const pendingArtistRequests =
    artistRequestsMetaQuery.data?.meta?.total ?? 0;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-[300px] shrink-0 border-r border-sidebar-border/60 bg-sidebar lg:flex lg:flex-col">
          <SidebarContent
            pathname={pathname}
            pendingArtistRequests={pendingArtistRequests}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/80 bg-background/75 backdrop-blur">
            <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Sheet>
                  <SheetTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl border-border bg-card text-foreground shadow-none lg:hidden"
                      />
                    }
                  >
                    <Menu className="size-5" />
                    <span className="sr-only">Open navigation</span>
                  </SheetTrigger>

                  <SheetContent
                    side="left"
                    className="w-[88vw] max-w-[320px] border-r-0 bg-sidebar p-0 text-sidebar-foreground"
                    showCloseButton={true}
                  >
                    <SheetHeader className="sr-only">
                      <SheetTitle>Admin Navigation</SheetTitle>
                      <SheetDescription>
                        Navigate between dashboard sections.
                      </SheetDescription>
                    </SheetHeader>
                    <SidebarContent
                      pathname={pathname}
                      pendingArtistRequests={pendingArtistRequests}
                    />
                  </SheetContent>
                </Sheet>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                    Admin Panel
                  </p>
                  <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                    {pageTitle}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-primary/25 bg-primary/12 px-3 py-1.5 sm:flex">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                    System Active
                  </span>
                </div>

                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground transition hover:border-primary/35 hover:text-primary"
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
