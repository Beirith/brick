# Brick frontend

A real estate share marketplace built with Next.js App Router, React, Wagmi and
Viem. The interface is entirely in English. Geist and Geist Mono are preserved.

## Run

Use Node 24 (`nvm use` at the repository root), then:

```bash
cd web
npm ci
cp .env.example .env.local
npm run dev
```

Set the public contract addresses in `.env.local` before starting the application:

```dotenv
NEXT_PUBLIC_MOCK_BRL_ADDRESS=0x...
NEXT_PUBLIC_PROPERTY_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_PROPERTY_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_PROPERTY_INCOME_ADDRESS=0x...
```

Governance analysis is intentionally mocked for the demo. No API key or mock-mode
flag is required; renovation and rental review each have a labeled simulation.

Deploy MockBRL, PropertyFactory and PropertyMarketplace in advance using the
existing Foundry script in `contracts/script/Deploy.s.sol`. See
`contracts/README.md` for its keystore workflow. For HSK Testnet use
`https://testnet.hsk.xyz` and chain ID 133. Test HSK covers network fees; mBRL is
fictional and has no real value. Never use mainnet funds for this demo.

There is no browser deployment, local-storage address configuration, or manual
address form. Missing/invalid configuration produces a public availability
message. Restart the development server or rebuild after changing environment
variables. Only public addresses belong in NEXT_PUBLIC variables.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page: what Brick is, features, how it works, link to the marketplace |
| `/marketplace` | Properties with active offers, grouped by property |
| `/properties/new` | Name, value, share count, estimated price and tokenization |
| `/properties/[id]` | Overview tab: at-a-glance stats, available offers and the buy flow |
| `/properties/[id]/decisions` | Decisions tab: AI-assisted governance proposals and voting |
| `/properties/[id]/income` | Income tab: income to claim, payment history and the owner's rent-payment/QR-code tools (hidden if the income contract is not configured) |
| `/properties/[id]/pay` | Public rent-payment page, no wallet required (e.g. a tenant scanning a QR code); accepts optional `amount`/`reference` query parameters |
| `/properties/[id]/purchase/success` | Confirmed purchase summary and portfolio access |
| `/properties/[id]/sell` | Quantity, unit price, offer total and publication |
| `/portfolio` | Income to claim across properties, clickable holdings and active offers. Wallet balance and demo mint live in the header. |

IDs are the factory's zero-based property IDs. Creation reads PropertyCreated
from the confirmed receipt before redirecting, avoiding concurrent-creation races.

## Architecture and design

- `config/contracts.ts`: read-only environment configuration and typed ABIs.
- `lib/brick.ts`, `hooks/useBrick.ts`: shared queries, all properties/listings,
  requests in batches of eight, optional inline location metadata.
- `components/Transactions.tsx`: persistent transaction progress, wallet/network
  checks, simulation, receipt confirmation, cache invalidation, product errors.
- `SiteHeader`, `ConnectWallet`, `DataBoundary`, `ui`: shared navigation and states.
  Wallet address, demo balance and the demo-mint button live in the header menu.
- `components/properties/*`: property cards, creation, buying and selling.
- `components/properties/PropertyTabsHeader.tsx`: shared back-link, heading and
  Overview/Decisions/Income tab navigation for a property; `PropertyOverview.tsx`,
  `PropertyDecisions.tsx` and `PropertyIncomeTab.tsx` are the three tab bodies.
- `hooks/useIncome.ts`, `components/properties/PropertyIncome.tsx`: rental-income
  totals, a single Claim button that settles every outstanding payment round for
  a property, per-payment "your part" (read from `getPastVotes` so it stays
  visible after a claim) and the owner's "Record a rent payment" flow, which can
  also generate a QR code/link (`react-qr-code`) to `/properties/[id]/pay`.
- `components/properties/PayRent.tsx`, `app/api/pay-rent/route.ts`: the public,
  wallet-less rent-payment page behind that QR code/link. The visitor only enters
  an amount and reference; the server-side route (a dedicated HSK Testnet key in
  `DEMO_PAYER_PRIVATE_KEY`, never exposed to the client) mints demo mBRL as needed,
  approves once, and calls `createDistribution` — a real on-chain payment the
  visitor never signs. The income contract has no depositor role, by design, so
  this mock payer is treated the same as any other payer.
- `app/api/governance/analyze/route.ts`: deterministic, explicitly labeled AI simulations
  and input validation before an authorized wallet can publish the recommendation.
- `Portfolio`: an "Income to claim" block summing claimable income across every
  held property with a claim button each, clickable property cards with share
  values and rental income, and offer cancellation.

`globals.css` defines semantic color tokens (orange, charcoal, off-white), shared
buttons, panels, badges, inputs, statistics, spacing and responsive grids.
Typography uses Geist; wallet identifiers use Geist Mono. Focus styles, a skip
link, reduced-motion support and live transaction announcements are included.

## Demo journey

1. Connect a wallet to HSK Testnet.
2. Add a property, then list some shares from its detail page.
3. Connect a second test account and add demo funds from the wallet menu in the header.
4. Browse the marketplace, open the property and buy shares from an offer.
5. Check holdings in My portfolio. Sellers can cancel unsold offers there.
6. As the property creator, request an AI analysis and publish it for 24-hour voting.
7. Use holder wallets to vote, then finalize the result after the deadline.
8. As the property creator, open the property's Income tab and either record a
   rent payment directly or generate a QR code/link to `/properties/[id]/pay` so
   a tenant pays with a tap, no wallet needed. Each holder can then claim their part
   with one button, either from the property's Income tab or from the "Income
   to claim" block in My portfolio.

Two MetaMask confirmations remain necessary for buying and listing. Progress
explains the two steps without exposing internal method names. Canceling the
second step does not undo the first confirmed authorization; no purchase or offer
is completed in that case. Amounts and approvals remain exact bigint values.

## Paying rent from a phone (QR code)

The QR code on a property's Income tab encodes a link to `/properties/[id]/pay`.
For a phone to actually reach it:

1. Set `NEXT_PUBLIC_PROPERTY_INCOME_ADDRESS` to a `PropertyIncomeDistributor`
   that accepts a deposit from any address (not just the property creator) —
   `createDistribution` has no depositor role by design.
2. Set `DEMO_PAYER_PRIVATE_KEY` to a dedicated, disposable HSK Testnet private
   key (`cast wallet new` generates one) and fund that address with a small
   amount of test HSK to cover gas. It mints and deposits fictional mBRL on
   behalf of anyone who taps "Pay rent" — the visitor never needs a wallet.
3. Set `NEXT_PUBLIC_APP_URL` to a URL your phone can reach: this machine's LAN
   address (`http://<lan-ip>:3000`, shown by `hostname -I` on Linux) or a public
   tunnel. `next dev`/`next start` already bind to `0.0.0.0` in `package.json`
   so the LAN address is reachable; the browser's own origin ("localhost") only
   resolves on the same device and is used only as a fallback.
4. If the phone still cannot reach it, the Wi-Fi network may isolate devices
   from each other (common on shared/conference networks). Use the phone as a
   hotspot and connect this machine to it instead, or use a public tunnel.

## Validation

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
node --experimental-strip-types --test scripts/product.test.mjs
```

Build uses Webpack to accommodate this environment's Turbopack restrictions.

For the existing local transaction smoke test, compile contracts with Foundry,
start `anvil --port 8547`, then run `node scripts/smoke-local.mjs` from `web`.
It reads Foundry artifacts directly; deployment code is restricted to this local
developer test and is not shipped to the browser.

## MVP limits

- Governance uses a simple YES/NO majority with no quorum. Approved decisions are
  recorded but treasury payments are not executed automatically.
- Voting power is fixed at proposal creation using token checkpoints. Shares held
  in marketplace escrow at that moment do not give their seller voting power in
  that proposal.
- The AI receives only the property values and decision entered in the interface.
  It has no wallet key, cannot vote and cannot move funds. The API route has input
  validation but production still needs authentication, durable rate limiting,
  moderation and monitoring.
- No legal ownership verification, property document validation or real money.
- Location displays only when supplied in inline JSON metadata. Current creation
  collects only name/value/shares; external metadata URLs and photos are not loaded.
- All entries are read without an indexer. Batched requests avoid omitting older
  holdings but loading time grows with the total number of properties/offers.
- Portfolio displays active offers only, not a full transaction history.
- Rental income uses fictional mBRL. Ownership is fixed at each deposit block,
  so later transfers cannot duplicate a claim. Marketplace-custodied shares do
  not accrue to the seller in this MVP, and integer division can leave dust.
- Actual purchases require sufficient demo balance and test HSK in MetaMask.

## Governance demonstration

The Decisions tab reads requests from each property's `PropertyGovernance` contract
through `governanceByToken`. Pending decisions include open votes and results
awaiting finalization; finalized decisions appear under Decision history.
All visitors can read the requests. Any wallet holding shares of this property, or an explicitly authorized proposer, publishes
after signing with their wallet. Snapshot shareholders vote Yes/No, once per proposal,
with weight proportional to their shares. Votes start after the snapshot block.
Shares held in marketplace escrow do not give voting power to the seller.

The analysis endpoint now deliberately returns deterministic mock advice without
calling an external AI API, even if API credentials are configured:

- Renovation: a hypothetical 8% property-value increase.
- Rental review: rent hypothetically 3% below the regional average; matching that
  average would imply about 3.09% growth from the current rent.
- Other requests: neutral advice without a financial projection.

Every analysis is labeled `SIMULATED AI ANALYSIS` in the reasoning saved on-chain.
Changing a draft clears its previous analysis. Publishing requires wallet confirmation;
no proposal is created by merely requesting an analysis. Approval records a decision,
not automatic execution or a change to rent/property value. The deployed contract ABI
is unchanged; no new factory deployment is required for properties already supporting
governance. Run `node --test scripts/governance.test.mjs` with Node 24 for mock tests.

### Shareholder publication

The updated governance contract exposes `canPropose(address)` and checks current
property-token balance in `createProposal`. No proposer role is needed for a holder.
After selling/transferring every share, this permission ends unless the address
also has an explicit role. Escrowed shares are not wallet balances: cancel an
offer to recover shares before proposing if the entire balance is listed.

Existing non-upgradeable governance deployments retain their old permission rule.
The UI preserves reading/voting on those contracts and explains the limitation.
For automatic shareholder permission, publish the updated factory and create demo
properties using it, with matching marketplace and income deployments/configuration.
Do not replace live configuration without planning the migration: old properties
and proposals remain at their original addresses. No network migration is performed
by this source change.
