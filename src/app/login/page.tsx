"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";

const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type LoginValues = z.infer<typeof loginSchema>;

type LoginResponse = {
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

const highlights = [
  {
    icon: ShieldCheck,
    title: "Secure admin access",
    description:
      "Lapisan autentikasi untuk menjaga akses dashboard tetap aman dan terkontrol.",
  },
  {
    icon: TrendingUp,
    title: "Realtime monitoring",
    description:
      "Pantau performa bisnis, aktivitas tim, dan insight operasional dalam satu panel.",
  },
  {
    icon: Sparkles,
    title: "Modern workflow",
    description:
      "Tampilan premium yang cepat, bersih, dan nyaman dipakai untuk kerja harian admin.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginValues) => {
      const response = await apiClient.post<LoginResponse>(
        "/auth/login",
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Login berhasil");
      router.replace("/dashboard");
      router.refresh();
    },
    onError: () => {
      toast.error("Login gagal, cek email atau password");
    },
  });

  const isSubmitting = loginMutation.isPending;

  const featureItems = useMemo(
    () =>
      highlights.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-black shadow-[0_10px_30px_-12px_rgba(249,115,22,0.8)]">
            <Icon className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-tight text-white">
              {title}
            </h3>
            <p className="text-sm leading-6 text-white/70">{description}</p>
          </div>
        </div>
      )),
    [],
  );

  function onSubmit(values: LoginValues) {
    loginMutation.mutate(values);
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden overflow-hidden bg-black lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.18),transparent_28%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_40%,rgba(249,115,22,0.04))]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-8 xl:p-12">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-black shadow-lg">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-400">
                  CommisApp
                </p>
                <h1 className="text-lg font-semibold text-white">
                  Admin Panel
                </h1>
              </div>
            </div>

            <div className="max-w-xl space-y-8">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
                  <Sparkles className="size-3.5" />
                  Premium workspace
                </div>

                <div className="space-y-4">
                  <h2 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
                    Kelola operasional admin dengan tampilan yang lebih modern
                    dan powerful.
                  </h2>
                  <p className="max-w-xl text-base leading-7 text-white/70">
                    Satu dashboard untuk memantau aktivitas, mengelola data, dan
                    mengambil keputusan lebih cepat dengan workflow yang rapi
                    dan profesional.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">{featureItems}</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Access
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">24/7</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Security
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  Encrypted
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Experience
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  Premium
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.12),transparent_30%),linear-gradient(to_bottom,#ffffff,#fff7ed)] px-4 py-10 sm:px-6 lg:px-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.02),transparent_25%,rgba(249,115,22,0.05))]" />

          <div className="relative z-10 w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-black text-orange-500 shadow-lg">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
                  CommisApp
                </p>
                <h2 className="text-base font-semibold text-black">
                  Admin Panel
                </h2>
              </div>
            </div>

            <Card className="overflow-hidden rounded-[28px] border border-black/10 bg-white/90 py-0 text-black shadow-[0_30px_80px_-35px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="border-b border-black/5 bg-gradient-to-r from-black to-zinc-900 p-6 text-white sm:p-8">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300">
                  <ShieldCheck className="size-3.5" />
                  Authorized access only
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Welcome back
                  </h2>
                  <p className="max-w-sm text-sm leading-6 text-white/70">
                    Masuk ke admin panel untuk mengelola data, memantau
                    aktivitas, dan mengontrol operasional aplikasi.
                  </p>
                </div>
              </div>

              <CardContent className="p-6 sm:p-8">
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/70"
                    >
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@commis.app"
                      autoComplete="email"
                      {...form.register("email")}
                      className="h-12 rounded-2xl border-black/10 bg-white px-4 text-sm shadow-none transition focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                    />
                    {form.formState.errors.email ? (
                      <p className="text-xs font-medium text-orange-600">
                        {form.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/70"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Masukkan password"
                        autoComplete="current-password"
                        {...form.register("password")}
                        className="h-12 rounded-2xl border-black/10 bg-white px-4 pr-12 text-sm shadow-none transition focus-visible:border-orange-500 focus-visible:ring-orange-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((state) => !state)}
                        className="absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-black/50 transition hover:text-orange-500 focus:outline-none"
                        aria-label={
                          showPassword
                            ? "Sembunyikan password"
                            : "Tampilkan password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="size-4.5" />
                        ) : (
                          <Eye className="size-4.5" />
                        )}
                      </button>
                    </div>
                    {form.formState.errors.password ? (
                      <p className="text-xs font-medium text-orange-600">
                        {form.formState.errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-black/70">
                    Gunakan akun admin yang sudah terdaftar untuk mengakses
                    dashboard management.
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-2xl bg-orange-500 text-sm font-semibold text-black shadow-[0_18px_40px_-18px_rgba(249,115,22,0.9)] transition hover:bg-orange-400 active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      "Authenticating..."
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Sign in to dashboard
                        <ArrowRight className="size-4" />
                      </span>
                    )}
                  </Button>

                  <p className="text-center text-xs leading-6 text-black/50">
                    Dengan login, kamu mengakses area administrasi internal
                    CommisApp.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
