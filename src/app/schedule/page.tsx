import DayPlanner from './DayPlanner'

export const metadata = { title: 'day planner — diwakar' }

export default function SchedulePage() {
  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px 80px' }}>
      <DayPlanner />
    </main>
  )
}
