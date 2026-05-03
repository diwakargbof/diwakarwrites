import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-20">
      <div className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Diwakar</h1>
        <p className="text-lg text-gray-500">Writing, tracking, and living out loud.</p>
      </div>

      <nav className="flex flex-col gap-6">
        <Link href="/writings" className="group">
          <div className="border border-gray-200 rounded-xl p-6 hover:border-gray-400 transition-colors">
            <h2 className="text-xl font-semibold mb-1">Writings</h2>
            <p className="text-gray-500 text-sm">Chapters, essays, and everything I put to words.</p>
          </div>
        </Link>

        <Link href="/dashboard" className="group">
          <div className="border border-gray-200 rounded-xl p-6 hover:border-gray-400 transition-colors">
            <h2 className="text-xl font-semibold mb-1">Dashboard</h2>
            <p className="text-gray-500 text-sm">Food, weight, strength, chess — my life in numbers.</p>
          </div>
        </Link>
      </nav>

      <footer className="mt-24 text-xs text-gray-400 flex justify-between">
        <span>diwakarwrites.com</span>
        <Link href="/write" className="hover:text-gray-600">write →</Link>
      </footer>
    </main>
  );
}
