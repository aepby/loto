import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthHeader } from "@/components/auth-header"

export const metadata = {
  title: "Bingo / Loto",
  description: "Application de pointage pour Bingo et Loto",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
