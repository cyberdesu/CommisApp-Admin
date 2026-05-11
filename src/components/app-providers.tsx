"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

import { Toaster } from "@/components/ui/sonner"
import { createQueryClient } from "@/lib/query-client"

type AppProvidersProps = {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors closeButton />
    </QueryClientProvider>
  )
}
