import { BaseTransfer, BaseTransferLike } from './BaseTransfer';
import {
  bn,
  Coin,
  InputCoin,
  InputType,
  PolicyType,
  ContractUtils,
  TransactionCreate,
  CreateTransactionRequest,
  CoinTransactionRequestInput,
} from 'fuels';

type DeployTransferFromTransaction = TransactionCreate & Omit<BaseTransferLike<CreateTransactionRequest>, 'transactionRequest' | 'witnesses'>;
type DeployTransferTransactionRequest = TransactionCreate & Pick<BaseTransferLike<CreateTransactionRequest>, 'vault'>;

const { getContractId, getContractStorageRoot } = ContractUtils;

/**
 * `DeployTransfer` are extension of CreateTransactionRequest, to create and deploy contracts
 */
export class DeployTransfer extends BaseTransfer<CreateTransactionRequest> {

  /**
   * Static method to create a new instance of DeployTransfer from a TransactionCreate.
   * @param {DeployTransferFromTransaction} params - The parameters for creating a DeployTransfer.
   * @param {string} params.name - The name of the transfer.
   * @param {Vault} params.vault - The vault associated with the transfer.
   * @param {ITransactionService} params.service - The transaction service used for the transfer.
   * @param {Witness[]} params.witnesses - The witnesses for the transfer.
   * @param {ITransaction} params.BakoSafeTransaction - The BakoSafeTransaction associated with the transfer.
   * @param {string} params.BakoSafeTransactionId - The ID of the BakoSafeTransaction.
   * @param {TransactionCreate} transaction - The transaction to be used for the transfer.
   * @returns {Promise<DeployTransfer>} A new instance of DeployTransfer.
   */
  static async fromTransactionCreate({ name, vault, service, witnesses, BakoSafeTransaction, BakoSafeTransactionId, ...transaction }: DeployTransferFromTransaction): Promise<DeployTransfer> {
    const transactionRequest = await this.createTransactionRequest({ witnesses, vault, ...transaction });
    return new DeployTransfer({
      name,
      vault,
      service,
      transactionRequest,
      BakoSafeTransaction,
      BakoSafeTransactionId,
      witnesses: witnesses.map(witness => witness.data),
    });
  }

  /**
   * Static method to create a TransactionRequest for a DeployTransfer.
   * @param {DeployTransferTransactionRequest} options - The parameters for creating a TransactionRequest.
   * @param {Vault} options.vault - The vault associated with the transfer.
   * @param {Input[]} options.inputs - The inputs for the transfer.
   * @param {Witness[]} options.witnesses - The witnesses for the transfer.
   * @param {TransactionCreate} options.transaction - The transaction to be used for the transfer.
   * @returns {Promise<CreateTransactionRequest>} A new instance of CreateTransactionRequest.
   */
  static async createTransactionRequest(options: DeployTransferTransactionRequest): Promise<CreateTransactionRequest> {
    const { vault: account, inputs, witnesses, ...transaction } = options;

    const transactionRequest = CreateTransactionRequest.from({
      witnesses: witnesses.map((witnesse) => witnesse.data),
      bytecodeWitnessIndex: transaction.bytecodeWitnessIndex,
      salt: transaction.salt,
      storageSlots: transaction.storageSlots,
      maxFee: bn(10000),
      outputs: transaction.outputs,
      inputs: [],
    });

    // Update coin input to same id
    const coinInputIndex = inputs.findIndex(
      (input) => input.type === InputType.Coin,
    );
    if (coinInputIndex >= 0) {
      const [resource] = await account.getResourcesToSpend([
        {
          amount: bn(100),
          assetId: account.provider.getBaseAssetId(),
        },
      ]);
      const coinResource = <Coin>resource;
      const coinInput = <InputCoin>inputs[coinInputIndex];
      const coinTransactionRequestInput: CoinTransactionRequestInput = {
        ...coinResource,
        ...coinInput,
        txPointer: '0x00000000000000000000000000000000',
      };
      transactionRequest.inputs.push(coinTransactionRequestInput);
    }

    // Add max fee by policy
    const policy = transaction.policies.find(
      (policy) => policy.type === PolicyType.MaxFee,
    );
    if (policy) {
      transactionRequest.maxFee = bn(policy.data);
    }

    return transactionRequest;
  }

  /**
   * Gets the contract ID for the current transaction request.
   * This method first converts the transaction request to a transaction.
   * It then retrieves the bytecode from the transaction's witnesses.
   * Finally, it calls the getContractId function with the bytecode, the transaction's salt, and the storage root of the transaction's storage slots.
   * @returns {string} The contract ID.
   */
  getContractId(): string {
    const transaction = this.transactionRequest.toTransaction();
    const bytecode = transaction.witnesses[transaction.bytecodeWitnessIndex].data;

    return getContractId(
      bytecode,
      transaction.salt,
      getContractStorageRoot(transaction.storageSlots)
    );
  }
}