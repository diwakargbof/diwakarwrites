import Link from 'next/link'
import { supabase, Writing } from '@/lib/supabase'
import { createWriting } from './actions'

export default async function WritePage() {
  const { data: writings } = await supabase
    .from('writings')
    .select('*')
    .order('updated_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-10">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 block mb-1">← Home</Link>
          <h1 className="text-2xl font-bold">My Writings</h1>
        </div>
        <form action={createWriting}>
          <button
            type="submit"
            className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            + New
          </button>
        </form>
      </div>

      {!writings || writings.length === 0 ? (
        <p className="text-gray-400">No writings yet. Hit + New to start.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(writings as Writing[]).map((w) => (
            <li key={w.id}>
              <Link href={`/write/${w.id}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors">
                <div>
                  <p className="font-medium">{w.title || 'Untitled'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(w.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${w.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {w.published ? 'Published' : 'Draft'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
