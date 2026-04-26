export default function NotFound() {
  return (
    <main className="max-w-lg mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-2">Board not found</h1>
      <p className="text-[var(--muted)] mb-6">This board may have expired or the link is wrong.</p>
      <a
        href="/"
        className="inline-block rounded-xl bg-[var(--accent)] text-white font-semibold px-6 py-3 text-sm hover:opacity-90 transition-opacity"
      >
        Create a new board
      </a>
    </main>
  );
}
