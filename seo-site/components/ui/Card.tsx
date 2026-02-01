import type { ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }): JSX.Element {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{children}</div>;
}

