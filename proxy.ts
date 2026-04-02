import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AGE_COOKIE = "ec_age";
const AGE_PATH = "/age";

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname === "/login") return true;
  if (pathname === "/register") return true;
  if (pathname === AGE_PATH) return true;

  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;

  if (pathname.startsWith("/images")) return true;
  if (pathname.startsWith("/icons")) return true;
  if (pathname.startsWith("/logo")) return true;
  if (pathname.startsWith("/sounds")) return true;
  if (pathname.startsWith("/videos")) return true;

  if (pathname.startsWith("/api/age")) return true;

  return false;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const age = req.cookies.get(AGE_COOKIE)?.value;

  if (age !== "1") {
    const url = req.nextUrl.clone();
    url.pathname = AGE_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
