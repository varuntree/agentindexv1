import Link from 'next/link';

import type { Agent } from '@/types';

export interface AgentContactProps {
  agent: Agent;
}

interface ContactItem {
  href: string;
  label: string;
  value: string;
}

function buildContactItems(agent: Agent): ContactItem[] {
  const items: ContactItem[] = [];

  if (agent.phone) items.push({ href: `tel:${agent.phone}`, label: 'Phone', value: agent.phone });
  if (agent.mobile) items.push({ href: `tel:${agent.mobile}`, label: 'Mobile', value: agent.mobile });
  if (agent.email) items.push({ href: `mailto:${agent.email}`, label: 'Email', value: agent.email });

  return items;
}

function buildSocialLinks(agent: Agent): Array<{ href: string; label: string }> {
  const links: Array<{ href: string; label: string }> = [];
  if (agent.linkedin_url) links.push({ href: agent.linkedin_url, label: 'LinkedIn' });
  if (agent.facebook_url) links.push({ href: agent.facebook_url, label: 'Facebook' });
  if (agent.instagram_url) links.push({ href: agent.instagram_url, label: 'Instagram' });
  if (agent.personal_website_url) links.push({ href: agent.personal_website_url, label: 'Website' });
  if (agent.domain_profile_url) links.push({ href: agent.domain_profile_url, label: 'Domain profile' });
  return links;
}

export function AgentContact({ agent }: AgentContactProps): JSX.Element | null {
  const items = buildContactItems(agent);
  const socials = buildSocialLinks(agent);

  if (items.length === 0 && socials.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">Contact</h2>

      {items.length > 0 ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
              <dd className="mt-1 text-sm text-slate-900">
                <a href={item.href} className="hover:underline">
                  {item.value}
                </a>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {socials.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {socials.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

