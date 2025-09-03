import {
  bn,
  BN,
  ZeroBytes32,
  TransactionType,
  calculateGasFee,
  TransactionRequest,
  TransactionRequestLike,
  ScriptTransactionRequest,
  transactionRequestify,
} from 'fuels';

import { FAKE_WITNESSES } from '../utils/fakeWitness';
import { Vault } from '../Vault';
import { BakoProvider } from '../../provider';
import { ICreateTransactionPayload } from '../../provider/services';

/**
 * Service responsible for transaction preparation and gas estimation
 */
export class VaultTransactionService {
  constructor(private vault: Vault) {}

  /**
   * Prepares a transaction for the vault by including the fee configuration and predicate data.
   */
  async prepareTransaction<T extends TransactionRequest>(
    transactionRequest: T,
  ): Promise<T> {
    const originalMaxFee = transactionRequest.maxFee;
    const predicateGasUsed = await this.calculateMaxGasUsed();

    this.vault.populateTransactionPredicateData(transactionRequest);

    const witnesses = Array.from(transactionRequest.witnesses);
    const fakeSignatures = Array.from(
      { length: this.vault.maxSigners },
      () => FAKE_WITNESSES,
    );
    transactionRequest.witnesses.push(...fakeSignatures);

    const quantities = transactionRequest
      .getCoinOutputs()
      .map((o) => ({ assetId: String(o.assetId), amount: bn(o.amount) }));

    // @ts-ignore
    // Type mismatch due to incomplete provider typings; assembleTx is known to return an object with { assembledRequest } at runtime.
    const { assembledRequest } = await this.vault.provider.assembleTx({
      request: transactionRequest,
      feePayerAccount: this.vault,
      accountCoinQuantities: quantities,
    });
    transactionRequest = assembledRequest;

    let totalGasUsed = bn(0);
    transactionRequest.inputs.forEach((input) => {
      if ('predicate' in input && input.predicate) {
        input.witnessIndex = 0;
        input.predicateGasUsed = undefined;
        totalGasUsed = totalGasUsed.add(predicateGasUsed);
      }
    });

    const { gasPriceFactor } = await this.vault.provider.getGasConfig();
    const { maxFee, gasPrice } = await this.vault.provider.estimateTxGasAndFee({
      transactionRequest,
    });

    const predicateSuccessFeeDiff = calculateGasFee({
      gas: totalGasUsed,
      priceFactor: gasPriceFactor,
      gasPrice,
    });

    let baseMaxFee = maxFee;
    if (!originalMaxFee.eq(0) && originalMaxFee.cmp(maxFee) === 1) {
      baseMaxFee = originalMaxFee;
    }

    const maxFeeWithPredicateGas = baseMaxFee.add(predicateSuccessFeeDiff);
    transactionRequest.maxFee = maxFeeWithPredicateGas.mul(12).div(10);

    if (transactionRequest.type === TransactionType.Upgrade) {
      transactionRequest.maxFee = maxFeeWithPredicateGas.mul(5);
    }

    await this.vault.provider.estimateTxDependencies(transactionRequest);
    transactionRequest.witnesses = witnesses;

    return transactionRequest;
  }

  /**
   * Processes a transaction through BakoProvider workflow
   */
  async processBakoTransfer(
    tx: TransactionRequestLike,
    options?: Pick<ICreateTransactionPayload, 'name'>,
  ): Promise<{
    tx: TransactionRequest;
    hashTxId: string;
  }> {
    let result: TransactionRequest = transactionRequestify(tx);
    result = await this.prepareTransaction(result);

    if (this.vault.provider instanceof BakoProvider) {
      await this.vault.provider.saveTransaction(result, {
        name: options?.name,
        predicateAddress: this.vault.address.toB256(),
      });
    }

    const chainId = await this.vault.provider.getChainId();

    return {
      tx: result,
      hashTxId: result.getTransactionId(chainId).slice(2),
    };
  }

  /**
   * Calculates the maximum gas used by a transaction.
   */
  private async calculateMaxGasUsed(): Promise<BN> {
    const request = new ScriptTransactionRequest();
    const { versions } = await import('../../../sway');
    const { Wallet } = await import('../utils/configurable');

    const origin = versions[this.vault.predicateVersion].walletOrigin;
    const config =
      origin === Wallet.BAKO
        ? {
            SIGNATURES_COUNT: this.vault.maxSigners,
            SIGNERS: Array.from(
              { length: this.vault.maxSigners },
              () => ZeroBytes32,
            ),
            HASH_PREDICATE: ZeroBytes32,
          }
        : {
            SIGNER: ZeroBytes32,
          };

    const vault = new Vault(
      this.vault.provider,
      config,
      this.vault.predicateVersion,
    );

    request.addCoinInput({
      id: ZeroBytes32,
      assetId: ZeroBytes32,
      amount: bn(),
      owner: vault.address,
      blockCreated: bn(),
      txCreatedIdx: bn(),
    });

    vault.populateTransactionPredicateData(request);
    Array.from({ length: this.vault.maxSigners }, () =>
      request.addWitness(FAKE_WITNESSES),
    );

    const transactionCost = await vault.getTransactionCost(request);
    await vault.fund(request, transactionCost);
    await vault.provider.estimatePredicates(request);
    const input = request.inputs[0];
    if ('predicate' in input && input.predicate) {
      return bn(input.predicateGasUsed);
    }

    return bn();
  }
}
