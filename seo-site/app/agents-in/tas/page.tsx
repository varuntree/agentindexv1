import type { Metadata } from 'next';

import { buildStateMetadata, StatePage } from '@/components/state/StatePage';

export async function generateMetadata(): Promise<Metadata> {
  return buildStateMetadata('tas');
}

export default function Page(): JSX.Element {
  return <StatePage stateSlug="tas" />;
}

