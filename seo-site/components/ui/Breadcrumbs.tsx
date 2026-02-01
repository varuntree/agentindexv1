import Link from 'next/link';

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }): JSX.Element {
  return (
    <nav aria-label="Breadcrumbs" className="text-sm text-slate-600">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="text-slate-600 hover:text-slate-900">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="text-slate-900">
                  {item.label}
                </span>
              )}
              {!isLast ? <span className="text-slate-400">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

