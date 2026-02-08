"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Shield } from "lucide-react"

type User = {
  id: number
  username: string
  isAdmin: boolean
}

export function AuthHeader() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
      .catch(() => {})
  }, [pathname])

  if (!user || pathname === "/login") return null

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 flex items-center gap-2 p-2 bg-white/80 backdrop-blur-sm rounded-tl-lg shadow-sm border-t border-l border-gray-200">
      <span className="text-sm text-muted-foreground">{user.username}</span>
      {user.isAdmin && pathname !== "/admin" && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <Shield className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
