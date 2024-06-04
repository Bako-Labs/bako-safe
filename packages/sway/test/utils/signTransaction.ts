import { WalletUnlocked, TransactionRequest, Provider } from 'fuels';

export async function signTransaction(
  wallet: WalletUnlocked,
  tx: TransactionRequest,
  provider: Provider,
) {
  const txHash = tx.getTransactionId(provider.getChainId());
  const signature = await wallet.signMessage(txHash);

  return signature;
}
