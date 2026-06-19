import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0];
  const url = request.nextUrl.clone();

  if (host === "www.tinymind.me") {
    url.hostname = "tinymind.me";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  if (url.pathname === "/home") {
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
