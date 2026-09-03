import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  if (await isAdmin()) redirect('/')

  const { next } = await searchParams
  return <LoginForm next={next ?? '/'} />
}
