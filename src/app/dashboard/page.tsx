import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-20">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 mb-10 block">← Back</Link>
      <h1 className="text-3xl font-bold mb-3">Dashboard</h1>
      <p className="text-gray-500 mb-12">Tracking coming soon.</p>
    </main>
  );
}
