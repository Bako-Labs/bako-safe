import {
  ContractUtils,
  CreateTransactionRequest,
  OutputType,
  type TransactionCreate,
  transactionRequestify,
} from 'fuels';
import { BaseTransfer, type BaseTransferLike } from './BaseTransfer';

import {
  type IBakoSafeAuth,
  type ITransaction,
  TransactionService,
  TransactionStatus,
} from '../../api';

/* Types */
type BaseDeployTransfer = BaseTransferLike<CreateTransactionRequest>;
type DeployTransferFromTransaction = TransactionCreate &
  Omit<
    BaseDeployTransfer,
    | 'transactionRequest'
    | 'witnesses'
    | 'service'
    | 'BakoSafeTransaction'
    | 'BakoSafeTransactionId'
  > & { auth?: IBakoSafeAuth };
type DeployTransferTransactionRequest = TransactionCreate &
  Pick<BaseDeployTransfer, 'vault'>;
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
   * @param {DeployBakoTransaction} options - The parameters for creating a DeployTransfer.
   * @returns {DeployTransfer} A new instance of DeployTransfer.
   */
  static async fromBakoTransaction(options: DeployBakoTransaction) {
    const { auth, vault, ...bakoTransaction } = options;

    const createTransactionRequest = CreateTransactionRequest.from(
      bakoTransaction.txData,
    );

    const bytecodeIndex = createTransactionRequest.bytecodeWitnessIndex;
    const bytecode = bakoTransaction.txData.witnesses[bytecodeIndex];

    const witnessesResume = bakoTransaction.resume.witnesses || [];
    const witnessesAccounts = witnessesResume
      .map((witness) => witness.signature)
      .filter((signature) => !!signature);

    const witnesses = [bytecode.toString(), ...witnessesAccounts];

    return new DeployTransfer({
      vault,
      witnesses,
      name: bakoTransaction.name,
      service: new TransactionService(auth),
      transactionRequest: createTransactionRequest,
      BakoSafeTransaction: bakoTransaction,
      BakoSafeTransactionId: bakoTransaction.id,
    });
  }

  /**
   * Static method to create a new instance of DeployTransfer from a TransactionCreate.
   *
   * @param {DeployTransferFromTransaction} options - The parameters for creating a DeployTransfer.
   * @returns {Promise<DeployTransfer>} A new instance of DeployTransfer.
   */
  static async fromTransactionCreate(
    options: DeployTransferFromTransaction,
  ): Promise<DeployTransfer> {
    const { name, vault, witnesses, auth, ...transaction } = options;
    const transactionRequest = await DeployTransfer.createTransactionRequest({
      witnesses,
      vault,
      ...transaction,
    });
    const deployTransfer = new DeployTransfer({
      name,
      vault,
      transactionRequest,
      witnesses: witnesses.map((witness) => witness.data),
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
  static async createTransactionRequest(
    options: DeployTransferTransactionRequest,
  ): Promise<CreateTransactionRequest> {
    const { vault, inputs, witnesses, ...transaction } = options;

    const bytecode = witnesses[transaction.bytecodeWitnessIndex];
    const contractOutput = transaction.outputs.find(
      (output) => output.type === OutputType.ContractCreated,
    );

    if (!contractOutput || !bytecode) {
      throw new Error('Contract output and bytecode are required.');
    }

    const transactionRequest = CreateTransactionRequest.from({
      inputs: [],
      salt: transaction.salt,
      witnesses: [bytecode.data],
      storageSlots: transaction.storageSlots,
      outputs: [contractOutput],
      bytecodeWitnessIndex: transaction.bytecodeWitnessIndex,
    });

    return DeployTransfer.prepareTransaction(vault, transactionRequest);
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
      name: this.name,
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
    const bytecode =
      transaction.witnesses[transaction.bytecodeWitnessIndex].data;

    return getContractId(
      bytecode,
      transaction.salt,
      getContractStorageRoot(transaction.storageSlots),
    );
  }
}
