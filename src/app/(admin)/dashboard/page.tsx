import { DashboardOverview } from "@/components/admin/dashboard-overview"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-200/70 bg-white/90 p-6 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">Ringkasan aktivitas aplikasi dan performa minggu ini.</p>
      </section>
      <DashboardOverview />
    </div>
  )
}
