import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_EXACT = ['/login', '/inscription']
const PUBLIC_PREFIX = ['/rejoindre']

function estRoutePublique(pathname: string) {
  return (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIX.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = estRoutePublique(pathname)

  // /login?mode=ajouter permet à un utilisateur déjà connecté d'ajouter un
  // compte supplémentaire sur cet appareil sans être renvoyé sur '/' : voir
  // src/components/switch-identite.tsx et src/app/login/login-form.tsx.
  const estAjoutDeCompte = pathname === '/login' && request.nextUrl.searchParams.get('mode') === 'ajouter'

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && PUBLIC_EXACT.includes(pathname) && !estAjoutDeCompte) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon$|icon-192|icon-512|apple-icon).*)',
  ],
}
