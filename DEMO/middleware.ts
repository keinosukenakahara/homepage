import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // 未ログインで保護ページへアクセス
  if (!user) {
    if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (path.startsWith('/staff') && !path.startsWith('/staff/login')) {
      return NextResponse.redirect(new URL('/staff/login', request.url))
    }
    return supabaseResponse
  }

  // ログイン済みでログインページへアクセス
  if (path === '/admin/login' || path === '/staff/login') {
    // プロフィールからロールを取得してリダイレクト
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'staff') {
      return NextResponse.redirect(new URL('/staff/dashboard', request.url))
    } else if (profile?.role) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  // スタッフがadminページへアクセス
  if (path.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'staff') {
      return NextResponse.redirect(new URL('/staff/dashboard', request.url))
    }
  }

  // 管理者がstaffページへアクセス
  if (path.startsWith('/staff')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'staff') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
