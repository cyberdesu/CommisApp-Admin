"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api/client"
import { setSession } from "@/lib/auth/token-storage"

const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

type LoginValues = z.infer<typeof loginSchema>

type LoginResponse = {
  data?: {
    accessToken?: string
    refreshToken?: string
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginValues) => {
      const response = await apiClient.post<LoginResponse>("/auth/login", payload)
      return response.data
    },
    onSuccess: () => {
      toast.success("Login berhasil")
      router.replace("/dashboard")
      router.refresh()
    },
    onError: () => {
      toast.error("Login gagal, cek email atau password")
    },
  })

  function onSubmit(values: LoginValues) {
    loginMutation.mutate(values)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(130deg,_#fff7ed_0%,_#fef3c7_48%,_#e0f2fe_100%)] px-4 py-10 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(251,146,60,0.15)_0,_transparent_42%),radial-gradient(circle_at_80%_70%,_rgba(2,132,199,0.18)_0,_transparent_44%)] dark:hidden" />
      <Card className="relative z-10 w-full max-w-md border-white/60 bg-white/90 text-zinc-900 shadow-2xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-50">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription className="dark:text-zinc-400">Masuk untuk mengelola CommisApp admin panel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@mail.com" 
                {...form.register("email")} 
                className="bg-white/50 dark:bg-zinc-950/50"
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  className="pr-10 bg-white/50 dark:bg-zinc-950/50"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((state) => !state)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {form.formState.errors.password ? (
                <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Masuk..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
