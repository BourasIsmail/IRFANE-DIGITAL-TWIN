import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export interface SessionData {
  token?:    string
  userEmail?: string
  userName?:  string
  isLoggedIn: boolean
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'irfane_dashboard_secret_key_32chars_min_2024!!',
  cookieName: 'irfane_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  if (!session.isLoggedIn) {
    session.isLoggedIn = false
  }
  return session
}

export async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn || !session.token) {
    redirect('/login')
  }
  return session
}