import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Users, ShieldCheck, Mail } from "lucide-react";

const userStats = [
  {
    label: "Total Users",
    value: "12,480",
    detail: "+8.2% bulan ini",
    icon: Users,
  },
  {
    label: "Admin Active",
    value: "24",
    detail: "Semua sistem normal",
    icon: ShieldCheck,
  },
  {
    label: "Pending Invite",
    value: "18",
    detail: "Butuh follow up",
    icon: Mail,
  },
];

const recentUsers = [
  {
    name: "Raka Pratama",
    email: "raka@commis.app",
    role: "Super Admin",
    status: "Active",
  },
  {
    name: "Nabila Sari",
    email: "nabila@commis.app",
    role: "Manager",
    status: "Active",
  },
  {
    name: "Dimas Saputra",
    email: "dimas@commis.app",
    role: "Support",
    status: "Invited",
  },
  {
    name: "Alya Putri",
    email: "alya@commis.app",
    role: "Finance",
    status: "Active",
  },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-orange-200 bg-linear-to-br from-black via-zinc-950 to-orange-950 text-white shadow-2xl shadow-orange-500/10">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-3">
            <Badge className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-semibold text-black hover:bg-orange-400">
              Team Control
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Users Management
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/75 md:text-base">
                Halaman ini sudah disiapkan supaya navigasi admin tidak rusak.
                Kamu bisa pakai area ini nanti untuk daftar user, role
                management, invite admin baru, dan pengaturan akses.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button className="h-11 rounded-2xl bg-orange-500 px-5 font-semibold text-black hover:bg-orange-400">
              <UserPlus className="size-4" />
              Invite User
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-white/20 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
            >
              Export List
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {userStats.map(({ label, value, detail, icon: Icon }) => (
          <Card
            key={label}
            className="rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/10"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardDescription className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                  {label}
                </CardDescription>
                <CardTitle className="text-3xl font-bold tracking-tight text-black">
                  {value}
                </CardTitle>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
                <Icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-black">
                Recent Team Members
              </CardTitle>
              <CardDescription className="text-sm text-zinc-500">
                Preview data untuk halaman users agar admin panel terasa lengkap
                dan siap dipakai.
              </CardDescription>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Cari user..."
                className="h-11 rounded-2xl border-zinc-200 bg-white pl-10 text-sm text-black placeholder:text-zinc-400 focus-visible:border-orange-400 focus-visible:ring-orange-200"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {recentUsers.map((user) => (
              <div
                key={user.email}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 transition-colors hover:border-orange-200 hover:bg-orange-50/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-black">
                    {user.name}
                  </p>
                  <p className="truncate text-sm text-zinc-500">{user.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700"
                  >
                    {user.role}
                  </Badge>
                  <Badge
                    className={
                      user.status === "Active"
                        ? "rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-black hover:bg-orange-400"
                        : "rounded-full bg-black px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
                    }
                  >
                    {user.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-black">
              Next Build Area
            </CardTitle>
            <CardDescription className="text-sm text-zinc-500">
              Placeholder ini bisa kamu lanjutkan jadi modul users yang full.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Daftar semua admin dan staff",
              "Filter berdasarkan role dan status",
              "Invite user baru via email",
              "Atur permission per modul",
              "Audit log aktivitas user",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-zinc-600">{item}</p>
              </div>
            ))}

            <div className="rounded-2xl border border-dashed border-orange-300 bg-orange-50 p-4">
              <p className="text-sm font-medium text-black">
                Status:
                <span className="ml-2 text-orange-600">
                  Ready sebagai placeholder page
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
