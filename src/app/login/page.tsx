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
          className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Icon className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-tight text-white">
              {title}
            </h3>
            <p className="text-sm leading-6 text-slate-400">{description}</p>
          </div>
        </div>
      )),
    [],
  );

  function onSubmit(values: LoginValues) {
    loginMutation.mutate(values);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.15),transparent_40%)]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-8 xl:p-12">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                  CommisApp
                </p>
                <h1 className="text-base font-semibold text-white">
                  Admin Panel
                </h1>
              </div>
            </div>

            <div className="max-w-xl space-y-8">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                  <Sparkles className="size-3" />
                  Premium workspace
                </div>

                <div className="space-y-4">
                  <h2 className="max-w-lg text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                    Kelola operasional admin dengan tampilan yang lebih modern
                    dan powerful.
                  </h2>
                  <p className="max-w-xl text-base leading-7 text-slate-400">
                    Satu dashboard untuk memantau aktivitas, mengelola data, dan
                    mengambil keputusan lebih cepat dengan workflow yang rapi
                    dan profesional.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">{featureItems}</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Access
                </p>
                <p className="mt-1.5 text-2xl font-bold text-white">24/7</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Security
                </p>
                <p className="mt-1.5 text-2xl font-bold text-white">
                  Encrypted
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Experience
                </p>
                <p className="mt-1.5 text-2xl font-bold text-white">
                  Premium
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.03),transparent_40%)]" />

          <div className="relative z-10 w-full max-w-[400px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                  CommisApp
                </p>
                <h2 className="text-base font-bold text-slate-900">
                  Admin Panel
                </h2>
              </div>
            </div>

            <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
              <div className="border-b border-slate-100 bg-white p-6 sm:p-8">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Welcome back
                  </h2>
                  <p className="text-sm leading-6 text-slate-500">
                    Masuk ke admin panel untuk mengelola operasional aplikasi.
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
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500"
                    >
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@commis.app"
                      autoComplete="email"
                      {...form.register("email")}
                      className="h-11 rounded-lg border-slate-200 bg-white px-3 text-sm shadow-sm transition-colors focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                    />
                    {form.formState.errors.email ? (
                      <p className="text-xs font-medium text-red-600">
                        {form.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500"
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
                        className="h-11 rounded-lg border-slate-200 bg-white px-3 pr-10 text-sm shadow-sm transition-colors focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((state) => !state)}
                        className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-slate-400 transition hover:text-indigo-600 focus:outline-none"
                        aria-label={
                          showPassword
                            ? "Sembunyikan password"
                            : "Tampilkan password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {form.formState.errors.password ? (
                      <p className="text-xs font-medium text-red-600">
                        {form.formState.errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-[0.98]"
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

                  <p className="text-center text-xs leading-6 text-slate-500">
                    Authorized personnel only.
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
