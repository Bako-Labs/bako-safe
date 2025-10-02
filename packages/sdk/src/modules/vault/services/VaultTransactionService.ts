import {
  type BN,
  bn,
  calculateGasFee,
  ScriptTransactionRequest,
  type TransactionRequest,
  type TransactionRequestLike,
  TransactionType,
  transactionRequestify,
  ZeroBytes32,
} from "fuels";
import { BakoProvider } from "../../provider";
import type { ICreateTransactionPayload } from "../../provider/services";
import { FAKE_WITNESSES } from "../utils/fakeWitness";
import { Vault } from "../Vault";

/**
 * Service responsible for transaction preparation and gas estimation
 */
export class VaultTransactionService {
  constructor(private vault: Vault) { }

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


    // Define the expected return type for assembleTx
    type AssembleTxResult = { assembledRequest: T };
    const { assembledRequest } = (await this.vault.provider.assembleTx({
      request: transactionRequest,
      feePayerAccount: this.vault,
    })) as AssembleTxResult;
    transactionRequest = assembledRequest;

    let totalGasUsed = bn(0);
    transactionRequest.inputs.forEach((input) => {
      if ("predicate" in input && input.predicate) {
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
    const multiplier =
      transactionRequest.type === TransactionType.Upgrade ? 50 : 25;
    transactionRequest.maxFee = maxFeeWithPredicateGas.mul(multiplier).div(10);

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
    options?: Pick<ICreateTransactionPayload, "name">,
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
    const { versions } = await import("../../../sway");
    const { Wallet } = await import("../utils/configurable");

    const origin = versions[this.vault.predicateVersion].walletOrigin[0]; // Use first supported wallet type
    const config =
      origin === Wallet.FUEL
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
    if ("predicate" in input && input.predicate) {
      return bn(input.predicateGasUsed);
    }

    return bn();
  }
}
