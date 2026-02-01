import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Not found</h1>
      <p className="mt-3 text-slate-600">The page you’re looking for doesn’t exist.</p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to homepage
        </Link>
      </div>
    </div>
  );
}

