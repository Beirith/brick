export type ProposalKind = 'renovation' | 'rent_update' | 'other';
export type Analysis = {
  title: string;
  description: string;
  recommendation: 'APPROVE' | 'REJECT' | 'NEUTRAL';
  reasoning: string;
  estimatedCost: number;
  mode: 'mock';
  kind: ProposalKind;
};

function text(value: unknown, maxBytes: number): string {
  if (typeof value !== 'string' || !value.trim() || new TextEncoder().encode(value.trim()).length > maxBytes) {
    throw new Error('Enter valid proposal information within the text limits.');
  }
  return value.trim();
}

/** Fixed demo assumptions, not market research or an external AI invocation. */
export function createMockAnalysis(value: unknown): Analysis {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Enter valid proposal information.');
  const input = value as Record<string, unknown>;
  const decision = text(input.decision, 1_000);
  if (!['renovation', 'rent_update', 'other'].includes(String(input.kind))) throw new Error('Select a proposal type.');
  const kind = input.kind as ProposalKind;
  const rawCost = input.estimatedCost ?? '';
  if (typeof rawCost !== 'string' || (rawCost.trim() && !/^\d+(\.\d{1,6})?$/.test(rawCost.trim()))) {
    throw new Error('Enter a nonnegative cost with up to six decimal places.');
  }
  const estimatedCost = Number(rawCost.trim() || '0');
  if (!Number.isFinite(estimatedCost) || estimatedCost > 1_000_000_000) throw new Error('Enter a cost no greater than 1,000,000,000 mBRL.');
  const reasoning = kind === 'renovation'
    ? 'SIMULATED AI ANALYSIS: This renovation scenario assumes a potential 8% increase in property value after completion. Modernized finishes and improved functionality could make the property more attractive. The 8% is a fixed demonstration assumption, not a valuation, market measurement or guaranteed return. Owners should review the scope and cost before approving.'
    : kind === 'rent_update'
      ? 'SIMULATED AI ANALYSIS: In this demo scenario, the current rent is 3% below the regional average. No regional listings or live market data were consulted. If rent equals 97% of that average, matching the average would require an approximately 3.09% increase from the current rent. Owners should review and vote on the proposed adjustment; approval does not change rent automatically.'
      : 'SIMULATED AI ANALYSIS: No financial impact is estimated for this general request. Owners should review the proposed action, its cost and supporting information before voting. No external AI service or market data was used.';
  return {
    title: kind === 'renovation' ? 'Property renovation request' : kind === 'rent_update' ? 'Rental price review request' : 'Property decision request',
    description: decision,
    recommendation: kind === 'other' ? 'NEUTRAL' : 'APPROVE',
    reasoning,
    estimatedCost,
    mode: 'mock',
    kind,
  };
}

export function isPendingDecision(status: number) {
  return status === 0 || status === 1;
}
