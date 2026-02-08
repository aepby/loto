import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const publicRoutes = ["/login"]
const adminRoutes = ["/admin"]

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Allow API routes to handle their own auth
  if (path.startsWith("/api")) {
    return NextResponse.next()
  }

  const token = request.cookies.get("session")?.value
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

  // Public routes: redirect to / if already authenticated
  if (publicRoutes.some((route) => path.startsWith(route))) {
    if (token) {
      try {
        await jwtVerify(token, secret)
        return NextResponse.redirect(new URL("/", request.nextUrl))
      } catch {
        // Invalid token, let them see login
      }
    }
    return NextResponse.next()
  }

  // All other routes require authentication
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.nextUrl))
  }

  try {
    const { payload } = await jwtVerify(token, secret)

    // Admin route protection
    if (adminRoutes.some((route) => path.startsWith(route))) {
      if (!payload.isAdmin) {
        return NextResponse.redirect(new URL("/", request.nextUrl))
      }
    }

    return NextResponse.next()
  } catch {
    // Invalid or expired token
    const response = NextResponse.redirect(new URL("/login", request.nextUrl))
    response.cookies.delete("session")
    return response
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.ico$|service-worker\\.js|manifest\\.webmanifest).*)",
  ],
}
