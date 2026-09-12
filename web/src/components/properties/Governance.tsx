'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatUnits, parseUnits, type Address, zeroAddress } from 'viem';
import { useConnection, usePublicClient } from 'wagmi';
import { configuredAddresses, factoryAbi, governanceAbi } from '@/config/contracts';
import { hskTestnet } from '@/config/wagmi';
import { type Property } from '@/lib/brick';
import { money, percentage } from '@/lib/format';
import { useTransaction } from '../Transactions';
import { isPendingDecision, type Analysis, type ProposalKind } from '@/lib/governance-analysis';

type Proposal = {
  id: bigint; title: string; description: string; aiRecommendation: number; aiReasoning: string; estimatedCost: bigint;
  createdAt: bigint; votingEndsAt: bigint; snapshotBlock: number; votesFor: bigint; votesAgainst: bigint;
  finalized: boolean; approved: boolean; executed: boolean;
};
type ProposalView = { proposal: Proposal; status: number; votingPower: bigint; voted: boolean };

const recommendationNames = ['NEUTRAL', 'APPROVE', 'REJECT'] as const;
const statusNames = ['Voting open', 'Ready to finalize', 'Approved', 'Rejected', 'Executed'] as const;

function proposalCost(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) throw new Error('Enter a valid estimated cost.');
  return parseUnits(value.toFixed(6), 6);
}

function dateLabel(timestamp: bigint) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Number(timestamp) * 1_000));
}

export function Governance({ property }: { property: Property }) {
  const { address } = useConnection();
  const client = usePublicClient({ chainId: hskTestnet.id });
  const { run, canSign, busy } = useTransaction();
  const [kind, setKind] = useState<ProposalKind>('renovation');
  const [showHistory, setShowHistory] = useState(false);
  const [decision, setDecision] = useState('');
  const [cost, setCost] = useState('');
  const [analysis, setAnalysis] = useState<Analysis>();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const query = useQuery({
    queryKey: ['governance', property.token, address],
    enabled: !!client && !!configuredAddresses,
    refetchInterval: 12_000,
    queryFn: async () => {
      const governance = await client!.readContract({ address: configuredAddresses!.factory, abi: factoryAbi, functionName: 'governanceByToken', args: [property.token] });
      if (governance === zeroAddress) return { governance, authorized: false, legacy: false, proposals: [] as ProposalView[] };
      const [count, proposerRole, aiRole] = await Promise.all([
        client!.readContract({ address: governance, abi: governanceAbi, functionName: 'proposalCount' }),
        client!.readContract({ address: governance, abi: governanceAbi, functionName: 'PROPOSER_ROLE' }),
        client!.readContract({ address: governance, abi: governanceAbi, functionName: 'AI_AGENT_ROLE' }),
      ]);
      let authorized = address ? (await Promise.all([
        client!.readContract({ address: governance, abi: governanceAbi, functionName: 'hasRole', args: [proposerRole, address] }),
        client!.readContract({ address: governance, abi: governanceAbi, functionName: 'hasRole', args: [aiRole, address] }),
      ])).some(Boolean) : false;
      let legacy = false;
      // Older deployments only support role-based publication. Preserve their read/vote flow.
      try {
        const eligible = await client!.readContract({ address: governance, abi: governanceAbi, functionName: 'canPropose', args: [address || zeroAddress] });
        authorized = !!address && eligible;
      } catch {
        legacy = true;
      }
      const proposals: ProposalView[] = [];
      for (let id = 0n; id < count; id++) {
        const [proposal, status, votingPower, voted] = await Promise.all([
          client!.readContract({ address: governance, abi: governanceAbi, functionName: 'getProposal', args: [id] }),
          client!.readContract({ address: governance, abi: governanceAbi, functionName: 'status', args: [id] }),
          address ? client!.readContract({ address: governance, abi: governanceAbi, functionName: 'votingPower', args: [id, address] }) : Promise.resolve(0n),
          address ? client!.readContract({ address: governance, abi: governanceAbi, functionName: 'hasVoted', args: [id, address] }) : Promise.resolve(false),
        ]);
        proposals.push({ proposal: proposal as Proposal, status, votingPower, voted });
      }
      return { governance, authorized, legacy, proposals };
    },
    retry: 1,
  });

  async function analyze() {
    if (!decision.trim()) { setAnalysisError('Describe the decision owners should consider.'); return; }
    setAnalyzing(true); setAnalysisError(''); setAnalysis(undefined);
    try {
      const response = await fetch('/api/governance/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind, decision: decision.trim(), estimatedCost: cost.trim(),
          property: { name: property.name, totalValueBaseUnits: property.value.toString(), totalShares: property.supply.toString(), location: property.location },
        }),
      });
      const result = await response.json() as Analysis & { error?: string };
      if (!response.ok) throw new Error(result.error || 'AI analysis failed.');
      setAnalysis(result);
    } catch (cause) { setAnalysisError(cause instanceof Error ? cause.message : 'AI analysis failed.'); }
    finally { setAnalyzing(false); }
  }

  const governance = query.data?.governance;
  const proposals = [...(query.data?.proposals || [])].reverse();
  const pending = proposals.filter(item => isPendingDecision(item.status));
  const visibleProposals = proposals.filter(item => showHistory ? !isPendingDecision(item.status) : isPendingDecision(item.status));
  return <section className="section-space governance-section" id="governance">
    <div className="section-heading"><div><span className="eyebrow">AI RECOMMENDS · OWNERS DECIDE</span><h2>Governance</h2></div></div>
    <p className="muted governance-intro">Requests and votes are recorded on HSK Testnet. All shareholders can read proposals; eligible snapshot holders can vote Yes or No. AI insights below are simulated for this demo.</p>
    {!configuredAddresses ? <div className="notice">Property contracts are not configured.</div> : query.isError ? <div className="notice">Could not load governance from the network. Try again; a connection error does not mean your proposals are missing.</div> : query.isPending ? <div className="panel muted">Loading governance…</div> : governance === zeroAddress ? <div className="notice">This property does not have a governance contract.</div> : <>
      <div className={`pending-decisions panel ${pending.length ? 'has-pending' : ''}`}><div><span className="eyebrow">PENDING DECISIONS</span><h3>{pending.length ? `${pending.length} item${pending.length === 1 ? '' : 's'} need attention` : 'No pending decisions'}</h3></div><p className="muted">{pending.length ? 'Review the active proposals below and cast your vote.' : 'There are no open votes or results waiting to be finalized.'}</p></div>
      <a className="muted" href={`${hskTestnet.blockExplorers.default.url}/address/${governance}`} target="_blank" rel="noreferrer">View governance contract on HSK Testnet ↗</a>
      {query.data.authorized && <div className="governance-builder panel">
        <div><span className="eyebrow">NEW PROPOSAL</span><h3>Ask the property agent</h3><p className="muted">Every current shareholder can submit a request. Choose a request type and review the simulated analysis before signing its publication to the network.</p></div>
        <label>Request type<select value={kind} disabled={analyzing || busy} onChange={event => { setKind(event.target.value as ProposalKind); setAnalysis(undefined); }}>
          <option value="renovation">Renovation / property improvement</option><option value="rent_update">Rental price update</option><option value="other">Other decision</option>
        </select></label>
        <label>Decision to analyze<textarea value={decision} onChange={event => { setDecision(event.target.value); setAnalysis(undefined); }} maxLength={1_000} rows={4} placeholder="Should we replace the air conditioning system due to rising maintenance costs?" disabled={analyzing || busy} /></label>
        <label>Estimated cost in mBRL <small>Optional. Use a decimal point, for example 3500.</small><input value={cost} onChange={event => { setCost(event.target.value); setAnalysis(undefined); }} inputMode="decimal" placeholder="3500" disabled={analyzing || busy} /></label>
        <button type="button" className="button-secondary" onClick={() => void analyze()} disabled={analyzing || busy}>{analyzing ? 'Preparing simulation…' : 'Generate simulated AI analysis'}</button>
        {analysisError && <p className="form-error" role="alert">{analysisError}</p>}
        {analysis && <div className="analysis-review">
          <div className="row"><span className={`recommendation recommendation-${analysis.recommendation.toLowerCase()}`}>{analysis.recommendation}</span><span className="muted">Simulated AI recommendation</span></div>
          <h3>{analysis.title}</h3>
          {analysis.kind !== 'other' && <div className="notice"><strong>{analysis.kind === 'renovation' ? '+8% potential property value' : 'Rent is 3% below the regional average'}</strong><p>Simulated scenario · no live market data</p></div>}
          <p>{analysis.description}</p><p className="muted"><strong>Reasoning:</strong> {analysis.reasoning}</p>
          <dl className="summary-lines"><div><dt>Estimated cost</dt><dd>{analysis.estimatedCost ? `${analysis.estimatedCost.toLocaleString('en-US')} mBRL` : 'Not specified'}</dd></div><div><dt>Voting period</dt><dd>24 hours</dd></div></dl>
          <p className="notice">Publishing records this analysis on-chain. It does not approve the proposal or spend funds.</p>
          <button type="button" className="full-width" disabled={!canSign} onClick={() => void run(async send => {
            const recommendation = { NEUTRAL: 0, APPROVE: 1, REJECT: 2 }[analysis.recommendation];
            await send(governance as Address, governanceAbi, 'createProposal', [analysis.title, analysis.description, recommendation, analysis.reasoning, proposalCost(analysis.estimatedCost), 86_400n], 'Publishing proposal');
            setAnalysis(undefined); setDecision(''); setCost(''); setShowHistory(false);
            return 'Proposal published. Owners can vote once the snapshot block is confirmed.';
          })}>Publish proposal</button>
        </div>}
      </div>}
      {!query.data.authorized && <div className="notice">{query.data.legacy ? 'This governance deployment still restricts publishing to authorized accounts. Shareholder publishing requires the updated contract.' : 'Connect a wallet holding shares of this property to publish a request. If all your shares are listed for sale, cancel an offer to return shares to your wallet.'}</div>}
      <div className="vote-actions" role="group" aria-label="Decision list">
        <button className={!showHistory ? '' : 'button-secondary'} aria-pressed={!showHistory} onClick={() => setShowHistory(false)}>Pending decisions ({pending.length})</button>
        <button className={showHistory ? '' : 'button-secondary'} aria-pressed={showHistory} onClick={() => setShowHistory(true)}>Decision history ({proposals.length - pending.length})</button>
        <button className="button-secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>Refresh</button>
      </div>
      <div className="proposal-list">
        {visibleProposals.length ? visibleProposals.map(({ proposal, status, votingPower, voted }) => {
          const cast = proposal.votesFor + proposal.votesAgainst;
          const yesWidth = cast ? formatUnits(proposal.votesFor * 10_000n / cast, 2) : '0';
          const noWidth = cast ? formatUnits(proposal.votesAgainst * 10_000n / cast, 2) : '0';
          const open = status === 0;
          return <article className="proposal-card panel" key={proposal.id.toString()}>
            <div className="proposal-top"><span className="eyebrow">PROPOSAL #{proposal.id.toString()}</span><span className={`status status-${status}`}>{statusNames[status] || 'Unknown'}</span></div>
            <h3>{proposal.title}</h3><p>{proposal.description}</p>
            <div className="ai-callout"><span className={`recommendation recommendation-${recommendationNames[proposal.aiRecommendation].toLowerCase()}`}>{recommendationNames[proposal.aiRecommendation]}</span><div><strong>{proposal.aiReasoning.startsWith('SIMULATED AI ANALYSIS:') ? 'Simulated AI analysis' : 'Recorded analysis'}</strong><p>{proposal.aiReasoning}</p></div></div>
            {proposal.estimatedCost > 0n && <p className="muted"><strong>Estimated cost:</strong> {money(proposal.estimatedCost)}</p>}
            <div className="vote-results"><div><span>Yes</span><strong>{yesWidth}%</strong></div><div className="vote-track"><span style={{ width: `${yesWidth}%` }} /></div><div><span>No</span><strong>{noWidth}%</strong></div><div className="vote-track vote-no"><span style={{ width: `${noWidth}%` }} /></div></div>
            <div className="proposal-meta"><span>Your voting power: <strong>{percentage(votingPower, property.supply)}</strong> ({votingPower.toString()} shares)</span><span>Voting ends {dateLabel(proposal.votingEndsAt)}</span></div>
            {open && <div className="vote-actions"><button disabled={!canSign || voted || votingPower === 0n} onClick={() => void run(async send => { await send(governance as Address, governanceAbi, 'voteFor', [proposal.id], 'Submitting Yes vote'); return 'Your Yes vote is confirmed.'; })}>Vote Yes</button><button className="button-secondary" disabled={!canSign || voted || votingPower === 0n} onClick={() => void run(async send => { await send(governance as Address, governanceAbi, 'voteAgainst', [proposal.id], 'Submitting No vote'); return 'Your No vote is confirmed.'; })}>Vote No</button></div>}
            {open && !voted && votingPower === 0n && <p className="muted">Voting requires shares in your wallet at the proposal snapshot. Listed shares held by the marketplace are not included. Newly published proposals become votable after the next block.</p>}
            {status === 2 && <p className="notice">Approved by voters. This records a decision only; renovation, property valuation and rent are not changed automatically.</p>}
            {voted && <p className="muted">Your vote has been recorded.</p>}
            {status === 1 && <button className="button-secondary" disabled={!canSign} onClick={() => void run(async send => { await send(governance as Address, governanceAbi, 'finalizeProposal', [proposal.id], 'Finalizing result'); return 'The proposal result is final.'; })}>Finalize result</button>}
          </article>;
        }) : <div className="empty-state"><span className="empty-icon" aria-hidden="true">✓</span><h3>{showHistory ? 'No resolved decisions yet' : 'No pending decisions'}</h3><p>{showHistory ? 'Finalized proposals will appear here.' : 'New proposals published to the network will appear here for shareholders to review.'}</p></div>}
      </div>
    </>}
  </section>;
}
