'use client'

import { useActionState } from 'react'
import { login } from './actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-8">Writer login</h1>
        <form action={action} className="flex flex-col gap-4">
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoFocus
            className="border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-600"
          />
          {state?.error && (
            <p className="text-red-500 text-sm">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="bg-black text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  )
}
