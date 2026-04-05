import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isStaticOrInternal(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  // On laisse la landing publique
  if (pathname === "/") {
    return NextResponse.next();
  }

  // On ne bloque plus les routes protégées ici.
  // Le layout protégé côté client s'en charge proprement.
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
