import { NextResponse, type NextRequest } from "next/server";

// Barreira rápida: sem cookie de sessão, vai para o login. A validação real da sessão
// acontece no servidor (src/server/auth.ts) em cada página e ação.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("explo_sessao")) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!login|_next|favicon.ico).*)"] };
