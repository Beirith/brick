'use client';
import { useState } from 'react';
import { useConnection, useConnect, useConnectors, useDisconnect, useSwitchChain } from 'wagmi';
import { hskTestnet } from '@/config/wagmi';
import { configuredAddresses, tokenAbi } from '@/config/contracts';
import { useBrick } from '@/hooks/useBrick';
import { money, shortAddress } from '@/lib/format';
import { useTransaction } from './Transactions';

export function ConnectWallet() {
  const [open, setOpen] = useState(false);
  const { address, isConnected, chainId } = useConnection();
  const { mutate: connect, isPending, error } = useConnect();
  const connectors = useConnectors();
  const { mutate: disconnect } = useDisconnect();
  const { mutate: switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const { data } = useBrick();
  const { run, canSign } = useTransaction();
  return <div className="wallet-control">
    {isConnected ? <div className="row">
      {chainId !== hskTestnet.id && <button disabled={switching} onClick={() => switchChain({ chainId: hskTestnet.id })}>Switch to HSK Testnet</button>}
      <button className="button-secondary" onClick={() => setOpen(!open)} aria-expanded={open}>{shortAddress(address!)} ▾</button>
      {open && <div className="wallet-menu">
        {configuredAddresses && <div className="wallet-menu-balance"><span className="eyebrow">Demo balance</span><strong>{data ? money(data.balance) : '—'}</strong></div>}
        {configuredAddresses && <button className="button-funds" disabled={!canSign} onClick={() => run(async send => { await send(configuredAddresses!.currency, tokenAbi, 'mint', [address, 500_000n * 10n ** 6n], 'Adding demo funds'); return '500,000 demo mBRL added to your balance.'; })}>Add demo funds</button>}
        <button className="button-secondary" onClick={() => { disconnect(); setOpen(false); }}>Disconnect</button>
      </div>}
    </div> : <>
      <button disabled={isPending} onClick={() => setOpen(!open)} aria-expanded={open}>{isPending ? 'Connecting…' : 'Connect wallet'}</button>
      {open && <div className="wallet-menu">{connectors.map(connector => <button className="button-secondary" key={connector.uid} disabled={isPending} onClick={() => connect({ connector, chainId: hskTestnet.id }, { onSuccess: () => setOpen(false) })}>{connector.name}</button>)}<small>Use a browser wallet such as MetaMask.</small></div>}
    </>}
    {(error || switchError) && <p role="alert" className="wallet-error">The wallet request could not be completed. Open MetaMask and try again.</p>}
  </div>;
}
