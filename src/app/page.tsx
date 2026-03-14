import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function Home() {
  const cookieStore = await cookies()
  const hasSession = Boolean(cookieStore.get("admin_access_token")?.value)

  if (hasSession) {
    redirect("/dashboard")
  }

  redirect("/login")
}
