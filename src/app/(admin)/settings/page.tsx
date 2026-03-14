import { BellRing, LockKeyhole, Palette, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const settingGroups = [
  {
    title: "Appearance",
    description: "Kelola tema admin panel, branding, dan preferensi tampilan antarmuka.",
    icon: Palette,
  },
  {
    title: "Notifications",
    description: "Atur notifikasi email, update pesanan, dan aktivitas penting sistem.",
    icon: BellRing,
  },
  {
    title: "Security",
    description: "Konfigurasi akses admin, autentikasi, dan proteksi akun dashboard.",
    icon: ShieldCheck,
  },
  {
    title: "Access Control",
    description: "Atur role, permission, dan kebijakan penggunaan untuk tim internal.",
    icon: LockKeyhole,
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-orange-200/70 bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
              Admin Settings
            </p>
            <h1 className="text-3xl font-black tracking-tight text-black">Pengaturan Panel Admin</h1>
            <p className="max-w-2xl text-sm text-black/65">
              Halaman ini sudah disiapkan supaya navigasi admin tidak error. Struktur ini juga siap
              dipakai untuk pengembangan fitur settings yang lebih lengkap.
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 bg-black px-4 py-3 text-white shadow-lg shadow-orange-500/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-400">
              Status
            </p>
            <p className="mt-1 text-sm font-medium text-white/90">Ready for implementation</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {settingGroups.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="rounded-3xl border border-black/10 bg-white py-0 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10"
          >
            <CardHeader className="px-6 pt-6">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
                <Icon className="size-5" />
              </div>
              <CardTitle className="text-lg font-bold text-black">{title}</CardTitle>
              <CardDescription className="text-sm leading-6 text-black/65">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/70 px-4 py-3 text-sm text-black/70">
                Modul ini belum diaktifkan, tapi layout dan entry point sudah tersedia.
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
