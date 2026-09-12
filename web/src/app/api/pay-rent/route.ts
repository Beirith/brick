import { createPublicClient, createWalletClient, http, isAddress, maxUint256, parseUnits, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hskTestnet } from '@/config/wagmi';
import { configuredAddresses, configuredIncomeAddress, factoryAbi, incomeAbi, tokenAbi } from '@/config/contracts';

type PayRequest = { token?: string; amount?: string; reference?: string };

// Demo-only: a server-held HSK Testnet wallet mints and deposits fictional mBRL so a
// payer never needs their own wallet, mBRL balance or test HSK. Never use a mainnet key here.
function payerAccount() {
  const privateKey = process.env.DEMO_PAYER_PRIVATE_KEY;
  if (!privateKey) return undefined;
  try { return privateKeyToAccount(privateKey as `0x${string}`); }
  catch { return undefined; }
}

export async function POST(request: Request) {
  if (!configuredAddresses || !configuredIncomeAddress) return Response.json({ error: 'Rent payments are not configured yet.' }, { status: 503 });
  const account = payerAccount();
  if (!account) return Response.json({ error: 'Mock payments are not configured on this server.' }, { status: 503 });

  let input: PayRequest;
  try { input = await request.json() as PayRequest; }
  catch { return Response.json({ error: 'Send a valid payment request.' }, { status: 400 }); }

  const token = input.token;
  if (typeof token !== 'string' || !isAddress(token)) return Response.json({ error: 'Unknown property.' }, { status: 400 });
  const reference = typeof input.reference === 'string' ? input.reference.trim().slice(0, 200) : '';
  let payAmount: bigint;
  try {
    if (typeof input.amount !== 'string' || !/^\d+(\.\d{1,6})?$/.test(input.amount)) throw new Error();
    payAmount = parseUnits(input.amount, 6);
    if (payAmount <= 0n) throw new Error();
  } catch { return Response.json({ error: 'Enter a valid rent amount.' }, { status: 400 }); }

  const transport = http(hskTestnet.rpcUrls.default.http[0]);
  const publicClient = createPublicClient({ chain: hskTestnet, transport });
  const walletClient = createWalletClient({ account, chain: hskTestnet, transport });

  try {
    const isProperty = await publicClient.readContract({ address: configuredAddresses.factory, abi: factoryAbi, functionName: 'isProperty', args: [token as Address] });
    if (!isProperty) return Response.json({ error: 'Unknown property.' }, { status: 404 });

    const [balance, allowance] = await Promise.all([
      publicClient.readContract({ address: configuredAddresses.currency, abi: tokenAbi, functionName: 'balanceOf', args: [account.address] }),
      publicClient.readContract({ address: configuredAddresses.currency, abi: tokenAbi, functionName: 'allowance', args: [account.address, configuredIncomeAddress] }),
    ]);

    if (balance < payAmount) {
      // Top up generously so repeated demo payments rarely need another mint.
      const topUp = payAmount * 10n > 5_000_000n * 10n ** 6n ? payAmount * 10n : 5_000_000n * 10n ** 6n;
      const hash = await walletClient.writeContract({ account, address: configuredAddresses.currency, abi: tokenAbi, functionName: 'mint', args: [account.address, topUp] });
      await publicClient.waitForTransactionReceipt({ hash });
    }
    if (allowance < payAmount) {
      // Approve once for a very large allowance so future payments skip this step entirely.
      const hash = await walletClient.writeContract({ account, address: configuredAddresses.currency, abi: tokenAbi, functionName: 'approve', args: [configuredIncomeAddress, maxUint256] });
      await publicClient.waitForTransactionReceipt({ hash });
    }

    const { request: simulated } = await publicClient.simulateContract({
      account, address: configuredIncomeAddress, abi: incomeAbi, functionName: 'createDistribution', args: [token as Address, payAmount, reference],
    });
    const hash = await walletClient.writeContract(simulated);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') return Response.json({ error: 'The payment could not be confirmed on-chain.' }, { status: 502 });
    return Response.json({ hash });
  } catch (error) {
    console.error('pay-rent failed', error);
    return Response.json({ error: 'The payment could not be completed. Please try again.' }, { status: 502 });
  }
}
