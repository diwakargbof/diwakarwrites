import Link from 'next/link'
import { supabase, Writing } from '@/lib/supabase'

export const revalidate = 60

export default async function WritingsPage() {
  const { data: writings } = await supabase
    .from('writings')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto px-6 py-20">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 block mb-10">← Back</Link>
      <h1 className="text-3xl font-bold mb-10">Writings</h1>

      {!writings || writings.length === 0 ? (
        <p className="text-gray-400">Nothing published yet.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {(writings as Writing[]).map((w) => (
            <li key={w.id}>
              <Link href={`/writings/${w.id}`} className="group block">
                <h2 className="text-xl font-semibold group-hover:underline">{w.title}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
