import { isAdmin } from '@/lib/auth'
import HomeDashboard from './HomeDashboard'
import HomePublic from './HomePublic'

export const dynamic = 'force-dynamic'

export default async function Home() {
  return (await isAdmin()) ? <HomeDashboard /> : <HomePublic />
}
