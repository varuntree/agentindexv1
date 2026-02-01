'use client';

import { useMemo, useState } from 'react';

import type { Agent } from '@/types';

import { AgentGrid } from './AgentGrid';

export interface SuburbFiltersProps {
  agents: Agent[];
}

const LANGUAGE_MISSING = '__missing_language__';
const LANGUAGE_PRESENT = '__has_language__';
const SPECIALIZATION_MISSING = '__missing_specialization__';
const SPECIALIZATION_PRESENT = '__has_specialization__';

interface Option {
  count: number;
  label: string;
}

function toSortedOptions(values: string[]): Option[] {
  const counts = new Map<string, number>();
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildLanguageOptions(agents: Agent[]): Option[] {
  return toSortedOptions(agents.flatMap((agent) => agent.languages));
}

function buildSpecializationOptions(agents: Agent[]): Option[] {
  return toSortedOptions(agents.flatMap((agent) => agent.specializations));
}

export function SuburbFilters({ agents }: SuburbFiltersProps): JSX.Element {
  const [language, setLanguage] = useState<string>('');
  const [specialization, setSpecialization] = useState<string>('');

  const languageOptions = useMemo(() => buildLanguageOptions(agents), [agents]);
  const specializationOptions = useMemo(() => buildSpecializationOptions(agents), [agents]);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesLanguage = (() => {
        if (!language) return true;
        if (language === LANGUAGE_MISSING) return agent.languages.length === 0;
        if (language === LANGUAGE_PRESENT) return agent.languages.length > 0;
        return agent.languages.includes(language);
      })();

      const matchesSpecialization = (() => {
        if (!specialization) return true;
        if (specialization === SPECIALIZATION_MISSING) return agent.specializations.length === 0;
        if (specialization === SPECIALIZATION_PRESENT) return agent.specializations.length > 0;
        return agent.specializations.includes(specialization);
      })();

      return matchesLanguage && matchesSpecialization;
    });
  }, [agents, language, specialization]);

  const showControls = true;

  return (
    <section className="space-y-4">
      {showControls ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            <div className="space-y-1">
              <label htmlFor="language-filter" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Language
              </label>
              <select
                id="language-filter"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="">All languages</option>
                <option value={LANGUAGE_MISSING}>Not specified</option>
                <option value={LANGUAGE_PRESENT}>Has language listed</option>
                {languageOptions.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="specialization-filter" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Specialization
              </label>
              <select
                id="specialization-filter"
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="">All specializations</option>
                <option value={SPECIALIZATION_MISSING}>Not specified</option>
                <option value={SPECIALIZATION_PRESENT}>Has specialization listed</option>
                {specializationOptions.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 text-sm text-slate-600 md:items-end">
              <div>
                Showing{' '}
                <span className="font-medium text-slate-900" data-testid="agent-count">
                  {filteredAgents.length}
                </span>{' '}
                of {agents.length}
              </div>
              {language || specialization ? (
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('');
                    setSpecialization('');
                  }}
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <AgentGrid agents={filteredAgents} />
    </section>
  );
}
