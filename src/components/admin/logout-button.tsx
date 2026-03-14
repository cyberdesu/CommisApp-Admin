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
      size="sm" 
      onClick={handleLogout} 
      className="h-10 w-full justify-start rounded-none border border-white/20 px-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:border-orange-500 hover:bg-orange-500 hover:text-black"
    >
      <LogOut className="mr-3 size-3" />
      Logout
    </Button>
  )
}
