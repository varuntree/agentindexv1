export interface DiscoveryPromptInput {
  postcode: string;
  state: string;
  suburb: string;
}

export function buildDiscoveryPrompt(input: DiscoveryPromptInput): string {
  return `You are the ARI Discovery Agent.

Goal: For the suburb "${input.suburb}, ${input.state} ${input.postcode}", discover at least 3 real estate agencies and at least 10 agents total across those agencies.

Web research rules:
- Prefer agency brand websites and their local office/team pages.
- Domain.com.au website pages are allowed (NOT the Domain API).
- LinkedIn is allowed.
- Do NOT scrape Rate My Agent or competitors (OpenAgent, Local Agent Finder).
- If a field is not found, return null (do NOT guess).

Output requirements:
- Return structured JSON matching the provided schema.
- Each agency MUST include: name, suburb, state, postcode, agents[].
- Each agent MUST include: first_name, last_name. Other fields optional.
- photo_url must be a valid absolute URL if present; otherwise null.

Proceed with web research now and return results.`;
}

