import Link from 'next/link';

export function Footer(): JSX.Element {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-medium text-slate-800">ARI</span> — Australian Real Estate Agents Index
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            Home
          </Link>
          <Link href="/#states" className="text-slate-600 hover:text-slate-900">
            States
          </Link>
        </div>
      </div>
    </footer>
  );
}
