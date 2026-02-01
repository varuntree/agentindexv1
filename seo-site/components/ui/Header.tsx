import Link from 'next/link';

export function Header(): JSX.Element {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          ARI
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/#states" className="text-slate-600 hover:text-slate-900">
            States
          </Link>
          <Link href="/#featured-suburbs" className="text-slate-600 hover:text-slate-900">
            Featured suburbs
          </Link>
        </nav>
      </div>
    </header>
  );
}
