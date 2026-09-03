import { isAdmin } from '@/lib/auth'
import BoardClient from './BoardClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Board · Diwakar',
  description: 'An open wall. Leave a note, or reply to one.',
}

export default async function BoardPage() {
  return <BoardClient admin={await isAdmin()} />
}
