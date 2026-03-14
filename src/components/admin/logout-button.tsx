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
    <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start">
      <LogOut className="mr-2 size-4" />
      Logout
    </Button>
  )
}
