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
      className="group h-auto w-full justify-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sidebar-foreground/75 transition-all duration-200 hover:bg-red-500/10 hover:text-red-300"
    >
      <div className="flex shrink-0 items-center justify-center">
        <LogOut className="size-5 text-sidebar-foreground/60 transition-colors group-hover:text-red-300" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <span className="truncate text-sm font-medium">
          Logout
        </span>
      </div>
    </Button>
  )
}
