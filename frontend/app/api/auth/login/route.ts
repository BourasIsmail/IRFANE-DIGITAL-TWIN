import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const KEYROCK = process.env.KEYROCK_URL ?? 'http://localhost:3005'

    const res = await fetch(`${KEYROCK}/v1/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: email, password }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = res.headers.get('x-subject-token')
    const data  = await res.json()

    const session = await getSession()
    session.token      = token!
    session.userEmail  = email
    session.userName   = data.token?.user?.username || email
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Login error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}