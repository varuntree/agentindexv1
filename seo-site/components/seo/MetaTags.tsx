export interface MetaTagsProps {
  canonicalUrl: string;
  description: string;
  title: string;
  noIndex?: boolean;
}

/**
 * Use inside `head.tsx` when you need explicit tags instead of `generateMetadata()`.
 */
export function MetaTags({ title, description, canonicalUrl, noIndex }: MetaTagsProps): JSX.Element {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
    </>
  );
}

