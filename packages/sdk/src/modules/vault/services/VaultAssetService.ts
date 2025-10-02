import { Address, ScriptTransactionRequest, TransactionRequest } from 'fuels';
import { Asset } from '../assets';
import { VaultTransaction } from '../types';
import { Vault } from '../Vault';

/**
 * Service responsible for asset-related operations in vaults
 */
export class VaultAssetService {
  constructor(private vault: Vault) {}

  /**
   * Creates a new transaction script using the vault resources.
   */
  async createAssetTransaction(params: VaultTransaction): Promise<{
    tx: TransactionRequest;
    hashTxId: string;
  }> {
    const { assets } = params;

    // Validate all recipient addresses are accounts
    await Promise.all(
      assets.map(async (asset) => {
        const addressType = await this.vault.provider.getAddressType(asset.to);
        if (addressType !== 'Account') {
          throw new Error(`Address ${asset.to} is not an Account`);
        }
      }),
    );

    const tx = new ScriptTransactionRequest();

    // Group assets by recipient and add coin outputs
    const outputs = Asset.assetsGroupByTo(assets);
    Object.entries(outputs).map(([, value]) => {
      tx.addCoinOutput(
        Address.fromString(value.to),
        value.amount,
        value.assetId,
      );
    });

    return this.vault.BakoTransfer(tx, { name: params.name });
  }

  /**
   * Validates an asset transfer configuration
   */
  validateAssetTransfer(assets: any[]): void {
    if (!Array.isArray(assets) || assets.length === 0) {
      throw new Error('Assets array is required and cannot be empty');
    }

    assets.forEach((asset, index) => {
      if (!asset.to || !asset.amount || !asset.assetId) {
        throw new Error(
          `Asset at index ${index} is missing required fields (to, amount, assetId)`,
        );
      }
    });
  }
}
