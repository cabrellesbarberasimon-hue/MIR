import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, tokenValido } from "@/lib/sesion";

export async function proxy(req: NextRequest) {
  if (await tokenValido(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
