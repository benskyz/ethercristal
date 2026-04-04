import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AGE_COOKIE = "ec_age";
const AGE_PATH = "/age";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/register",
  AGE_PATH,
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/sounds") ||
    pathname.startsWith("/videos") ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|mp3|mp4|webm|css|js|map|txt|xml)$/i.test(
      pathname
    )
  );
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (isStaticAsset(pathname)) return true;

  // Ne bloque pas les routes API ici.
  // Les API sensibles doivent gérer leur propre auth côté route.
  if (pathname.startsWith("/api/")) return true;

  return false;
}

function buildNextValue(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  return `${pathname}${search || ""}`;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    // Si l'âge est déjà validé, on évite de rester bloqué sur /age
    if (pathname === AGE_PATH) {
      const age = req.cookies.get(AGE_COOKIE)?.value;

      if (age === "1") {
        const url = req.nextUrl.clone();
        const requestedNext = req.nextUrl.searchParams.get("next");

        url.pathname =
          requestedNext && requestedNext.startsWith("/") ? requestedNext : "/login";
        url.search = "";

        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  }

  const age = req.cookies.get(AGE_COOKIE)?.value;

  if (age !== "1") {
    const url = req.nextUrl.clone();
    url.pathname = AGE_PATH;
    url.search = "";
    url.searchParams.set("next", buildNextValue(req));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
