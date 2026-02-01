export interface TokenUsageTotals {
  estimatedCostUsd: number | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface TokenUsageRates {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function getRatesFromEnv(): TokenUsageRates | null {
  const inputPerMillionUsd = toNumber(process.env.ANTHROPIC_PRICE_INPUT_PER_MILLION_USD);
  const outputPerMillionUsd = toNumber(process.env.ANTHROPIC_PRICE_OUTPUT_PER_MILLION_USD);
  if (inputPerMillionUsd === null || outputPerMillionUsd === null) return null;
  return { inputPerMillionUsd, outputPerMillionUsd };
}

export class CostTracker {
  private inputTokens = 0;
  private outputTokens = 0;

  add(inputTokens: number, outputTokens: number): void {
    if (Number.isFinite(inputTokens) && inputTokens > 0) this.inputTokens += inputTokens;
    if (Number.isFinite(outputTokens) && outputTokens > 0) this.outputTokens += outputTokens;
  }

  totals(): TokenUsageTotals {
    const totalTokens = this.inputTokens + this.outputTokens;
    const rates = getRatesFromEnv();
    const estimatedCostUsd = rates
      ? (this.inputTokens / 1_000_000) * rates.inputPerMillionUsd +
        (this.outputTokens / 1_000_000) * rates.outputPerMillionUsd
      : null;

    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens,
      estimatedCostUsd
    };
  }
}

