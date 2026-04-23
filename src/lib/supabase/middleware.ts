import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

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

  const url = request.nextUrl
  const path = url.pathname

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
