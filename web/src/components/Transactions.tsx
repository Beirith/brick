'use client';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConnection, usePublicClient, useWalletClient } from 'wagmi';
import { type Abi, type Address, type TransactionReceipt } from 'viem';
import { hskTestnet } from '@/config/wagmi';
import { configuredAddresses } from '@/config/contracts';

type Send = (target: Address, abi: Abi, method: string, args: readonly unknown[], label: string) => Promise<TransactionReceipt>;
type Actions = { busy: boolean; canSign: boolean; run: (action: (send: Send) => Promise<string>) => Promise<void> };
const Context = createContext<Actions | null>(null);

function friendlyError(cause: unknown) {
  const text = cause instanceof Error ? cause.message.toLowerCase() : '';
  if (/reject|denied|4001/.test(text)) return 'You canceled the request. You can try again when ready.';
  if (/insufficient funds|exceeds the balance/.test(text)) return 'You need test HSK to cover the network fee. Use the free testnet faucet; no real money is needed.';
  if (/account changed/.test(text)) return 'Your wallet account changed. Please start the action again.';
  if (/wrong network/.test(text)) return 'Switch to HSK Testnet to continue.';
  if (/not connected/.test(text)) return 'Connect your wallet to continue.';
  if (/revert/.test(text)) return 'This action could not be completed. Refresh the page and check your balance and the available shares.';
  if (/fetch|http|timeout|timed out/.test(text)) return 'We could not confirm the result. Check your wallet activity before trying again.';
  // Validation errors originate in our product layer; never expose low-level RPC errors.
  if (cause instanceof Error && /^(Enter |Quantity |Insufficient demo |This offer |Property created)/.test(cause.message)) return cause.message;
  return 'Something went wrong. Check your wallet activity and try again.';
}
export function TransactionProvider({ children }: { children: ReactNode }) {
  const { address, chainId } = useConnection();
  const { data: wallet } = useWalletClient();
  const client = usePublicClient({ chainId: hskTestnet.id });
  const queryClient = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  async function run(action: (send: Send) => Promise<string>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(false); setMessage('Preparing your request…');
    let confirmed = 0;
    const send: Send = async (target, abi, method, args, label) => {
      if (!wallet || !address || !client || !configuredAddresses) throw new Error('Not connected');
      if (await wallet.getChainId() !== hskTestnet.id) throw new Error('Wrong network');
      const accounts = await wallet.getAddresses();
      if (accounts[0]?.toLowerCase() !== address.toLowerCase()) throw new Error('Account changed');
      setMessage(`${label} · Confirm in MetaMask`);
      const { request } = await client.simulateContract({ account: address, address: target, abi, functionName: method, args });
      const hash = await wallet.writeContract({ ...request, chain: hskTestnet });
      setMessage(`${label} · Waiting for confirmation`);
      const result = await client.waitForTransactionReceipt({ hash });
      if (result.status !== 'success') throw new Error('Transaction reverted');
      confirmed++;
      return result;
    };
    try { setMessage(await action(send)); }
    catch (cause) {
      setError(true);
      setMessage(`${friendlyError(cause)}${confirmed ? ' The previous step was confirmed, but the full action was not completed.' : ''}`);
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['brick'] });
      await queryClient.refetchQueries({ queryKey: ['brick'], type: 'all' });
      setBusy(false); lock.current = false;
    }
  }
  return <Context.Provider value={{ busy, canSign: !!wallet && !!address && chainId === hskTestnet.id && !busy && !!configuredAddresses, run }}>
    {message && <div className={`transaction-banner ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">
      <span>{busy && <span className="spinner" aria-hidden="true" />}{message}</span>
      {!busy && <button className="button-ghost" onClick={() => setMessage('')} aria-label="Dismiss notification">×</button>}
    </div>}
    {children}
  </Context.Provider>;
}
export function useTransaction() {
  const value = useContext(Context);
  if (!value) throw new Error('TransactionProvider missing');
  return value;
}
