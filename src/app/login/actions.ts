'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(_: unknown, formData: FormData) {
  const password = formData.get('password') as string

  if (password === process.env.ADMIN_PASSWORD) {
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    redirect('/write')
  }

  return { error: 'Wrong password' }
}
