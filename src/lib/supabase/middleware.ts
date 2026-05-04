import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isValidGateCookie, GATE_COOKIE_NAME } from '@/lib/aiNose/gate'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const url = request.nextUrl
  const path = url.pathname

  // /aiNose 게이트 (자체 쿠키 인증, supabase auth 와 별개)
  if (path.startsWith('/aiNose') || path.startsWith('/api/aiNose')) {
    const isGatePage = path === '/aiNose/gate'
    const isGateApi = path === '/api/aiNose/gate'
    if (!isGatePage && !isGateApi) {
      const cookie = request.cookies.get(GATE_COOKIE_NAME)?.value
      const ok = await isValidGateCookie(cookie)
      if (!ok) {
        if (path.startsWith('/api/aiNose')) {
          return NextResponse.json({ ok: false, error: '게이트 인증 필요' }, { status: 401 })
        }
        const redirect = url.clone()
        redirect.pathname = '/aiNose/gate'
        redirect.searchParams.set('next', path)
        return NextResponse.redirect(redirect)
      }
    }
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = path.startsWith('/cafe-writer') || path.startsWith('/admin')
  const isAuthPage = path === '/login' || path === '/signup'
  const isPendingPage = path === '/pending'

  async function getApproved(): Promise<boolean> {
    if (!user) return false
    const { data } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', user.id)
      .maybeSingle()
    return Boolean(data?.approved)
  }

  if (isProtected) {
    if (!user) {
      const redirect = url.clone()
      redirect.pathname = '/login'
      redirect.searchParams.set('next', path)
      return NextResponse.redirect(redirect)
    }
    const approved = await getApproved()
    if (!approved) {
      const redirect = url.clone()
      redirect.pathname = '/pending'
      redirect.search = ''
      return NextResponse.redirect(redirect)
    }
  }

  if (isAuthPage && user) {
    const approved = await getApproved()
    const redirect = url.clone()
    redirect.pathname = approved ? '/cafe-writer' : '/pending'
    redirect.search = ''
    return NextResponse.redirect(redirect)
  }

  if (isPendingPage && user) {
    const approved = await getApproved()
    if (approved) {
      const redirect = url.clone()
      redirect.pathname = '/cafe-writer'
      redirect.search = ''
      return NextResponse.redirect(redirect)
    }
  }

  return response
}
