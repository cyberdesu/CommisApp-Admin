import Link from "next/link"
import { LayoutDashboard, Settings, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { LogoutButton } from "@/components/admin/logout-button"

type AdminShellProps = {
  children: React.ReactNode
}

const menus = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7_0%,_#fff7ed_45%,_#fff_100%)] text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-amber-200/80 bg-white/80 p-4 backdrop-blur lg:block">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold tracking-tight">Commis Admin</h2>
            <Badge variant="secondary">v0.1</Badge>
          </div>
          <nav className="space-y-1">
            {menus.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center rounded-lg px-3 py-2 text-sm text-zinc-700 transition hover:bg-amber-100 hover:text-zinc-900"
              >
                <Icon className="mr-2 size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 border-t border-amber-100 pt-4">
            <LogoutButton />
          </div>
        </aside>
        <main className="w-full">{children}</main>
      </div>
    </div>
  )
}
