import { BaseTransfer, BaseTransferLike } from './BaseTransfer';
import {
  bn,
  InputCoin,
  InputType,
  ContractUtils,
  TransactionCreate,
  transactionRequestify,
  CreateTransactionRequest,
  CoinTransactionRequestInput,
} from 'fuels';
import { IBakoSafeAuth, ITransaction, TransactionService, TransactionStatus } from '../../api';

type BaseDeployTransfer = BaseTransferLike<CreateTransactionRequest>;
type DeployTransferFromTransaction =
  TransactionCreate
  &
  Omit<BaseDeployTransfer, 'transactionRequest' | 'witnesses' | 'service' | 'BakoSafeTransaction' | 'BakoSafeTransactionId'>
  &
  { auth?: IBakoSafeAuth };
type DeployTransferTransactionRequest = TransactionCreate & Pick<BaseDeployTransfer, 'vault'>;
type DeployBakoTransaction = {
  auth: IBakoSafeAuth;
  vault: DeployTransferFromTransaction['vault'];
} & ITransaction;

const { getContractId, getContractStorageRoot } = ContractUtils;

/**
 * `DeployTransfer` are extension of CreateTransactionRequest, to create and deploy contracts
 */
export class DeployTransfer extends BaseTransfer<CreateTransactionRequest> {
  /**
   * Static method to create a new instance of DeployTransfer from a BakoTransaction.
   *
   * @param {DeployBakoTransaction} params - The parameters for creating a DeployTransfer.
   * @param {IBakoSafeAuth} params.auth - The authentication object.
   * @param {Vault} params.vault - The vault associated with the transfer.
   * @param {DeployBakoTransaction} bakoTransaction - The Bako transaction to be used for the transfer.
   * @returns {DeployTransfer} A new instance of DeployTransfer.
   */
  static async fromBakoTransaction({ auth, vault, ...bakoTransaction }: DeployBakoTransaction) {
    const createTransactionRequest = CreateTransactionRequest.from(bakoTransaction.txData);
    const witnesses = bakoTransaction.witnesses.map((witness) => witness.signature);

    return new DeployTransfer({
      vault,
      name: bakoTransaction.name,
      witnesses: [...witnesses, ...(bakoTransaction.resume?.witnesses ?? [])],
      service: new TransactionService(auth),
      transactionRequest: createTransactionRequest,
      BakoSafeTransaction: bakoTransaction,
      BakoSafeTransactionId: bakoTransaction.id
    });
  }

  /**
   * Static method to create a new instance of DeployTransfer from a TransactionCreate.
   *
   * @param {DeployTransferFromTransaction} params - The parameters for creating a DeployTransfer.
   * @param {string} params.name - The name of the transfer.
   * @param {Vault} params.vault - The vault associated with the transfer.
   * @param {Witness[]} params.witnesses - The witnesses for the transfer.
   * @param {TransactionCreate} transaction - The transaction to be used for the transfer.
   * @returns {Promise<DeployTransfer>} A new instance of DeployTransfer.
   */
  static async fromTransactionCreate({
                                       name,
                                       vault,
                                       witnesses,
                                       auth,
                                       ...transaction
                                     }: DeployTransferFromTransaction): Promise<DeployTransfer> {
    const transactionRequest = await this.createTransactionRequest({ witnesses, vault, ...transaction });
    const deployTransfer = new DeployTransfer({
      name,
      vault,
      transactionRequest,
      witnesses: witnesses.map(witness => witness.data)
    });

    if (auth) {
      deployTransfer.service = new TransactionService(auth);
    }

    return deployTransfer;
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
      outputs: transaction.outputs,
      inputs: []
    });

    // Update coin input to same id
    const inputCoin = inputs.find(
      (input) => input.type === InputType.Coin
    ) as InputCoin;
    if (inputCoin) {
      const [resource] = await account.getResourcesToSpend([
        {
          amount: inputCoin.amount,
          assetId: account.provider.getBaseAssetId()
        }
      ]);
      transactionRequest.addResource(resource);
    }

    const { estimatedPredicates } = await account.provider.getTransactionCost(transactionRequest);
    const coinInput = estimatedPredicates.find(coin => coin.type === InputType.Coin);
    if (coinInput) {
      transactionRequest.maxFee = bn((<CoinTransactionRequestInput>coinInput).predicateGasUsed);
    }

    return transactionRequest;
  }

  /**
   * Store the current transaction in server.
   *
   * @throws {Error} If the transaction has already been saved or if the service is not available.
   * @returns {Promise<DeployTransfer>} The current instance of DeployTransfer.
   */
  async save() {
    if (this.BakoSafeTransactionId || this.BakoSafeTransaction) {
      throw new Error('Transaction already saved.');
    }

    if (!this.service) {
      throw new Error('Auth is required to save the transaction.');
    }

    const transactionData = await this.service.create({
      assets: [],
      hash: this.getHashTxId(),
      txData: transactionRequestify(this.transactionRequest),
      status: TransactionStatus.AWAIT_REQUIREMENTS,
      predicateAddress: this.vault.address.toString(),
      name: this.name
    });

    this.BakoSafeTransaction = transactionData;
    this.BakoSafeTransactionId = transactionData.id;

    return this;
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