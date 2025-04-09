import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle ROM file MIME types
  if (request.nextUrl.pathname.startsWith('/roms/') && request.nextUrl.pathname.endsWith('.sfc')) {
    const response = NextResponse.next()
    response.headers.set('Content-Type', 'application/octet-stream')
    return response
  }

  return NextResponse.next()
} 