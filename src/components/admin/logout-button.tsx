"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { clearSession } from "@/lib/auth/token-storage"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    try {
      await apiClient.post("/auth/logout")
    } finally {
      clearSession()
      router.replace("/login")
      router.refresh()
    }
  }

  return (
    <Button 
      variant="ghost" 
      onClick={handleLogout} 
      className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-slate-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 h-auto justify-start"
    >
      <div className="flex shrink-0 items-center justify-center">
        <LogOut className="size-5 text-slate-500 group-hover:text-red-400 transition-colors" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <span className="truncate text-sm font-medium">
          Logout
        </span>
      </div>
    </Button>
  )
}
