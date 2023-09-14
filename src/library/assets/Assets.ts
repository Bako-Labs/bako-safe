import { BN, NativeAssetId, bn } from 'fuels';
import { IAssetGroupById, IAssetGroupByTo, ITransferAsset } from './types';

export class Asset {
    /**
     *  Asset: provides utils to organize assets
     */

    public static async assetsGroupById(list: ITransferAsset[]) {
        /**
         * Groupe assest by id
         *
         * @param ITransferAsset[] - An array of assets to transfer.
         * @returns An object with n unique keys, each key being an asset and the value of each key is equivalent to the sum of the equivalent assets received.
         */
        return list.reduce((acc: IAssetGroupById, asset: ITransferAsset) => {
            const { assetId, amount }: { assetId: string; amount: string } = asset;

            if (!acc[assetId]) {
                acc[assetId] = bn.parseUnits(amount);
                console.log('if neg', acc);
            } else {
                acc[assetId] = acc[assetId].add(bn.parseUnits(amount));
                console.log('else neg', acc);
            }

            return acc;
        }, {});
    }
    public static async assetsGroupByTo(list: ITransferAsset[]) {
        /**
         * Group assets by transaction destination
         *
         * @param ITransferAsset[] - An array of assets to transfer.
         * @returns An object with n unique keys, each key being a destination address and the value of each key is equivalent to the sum of the equivalent assets received.
         */

        return list.reduce((acc: IAssetGroupByTo, asset: ITransferAsset) => {
            const { to, amount, assetId }: ITransferAsset = asset;

            if (!acc[`${to}${assetId}`]) {
                acc[`${to}${assetId}`] = {
                    assetId,
                    amount: bn.parseUnits(amount),
                    to
                };
            } else {
                acc[`${to}${assetId}`].amount.add(bn.parseUnits(amount));
            }
            return acc;
        }, {}) as IAssetGroupByTo;
    }

    public static async addTransactionFee(assets: IAssetGroupById, _fee: BN) {
        /**
         * Checks if there is an eth asset in the transaction to pay for the gas and inserts a minimum amount
         *
         * @param ITransferAsset[] - An array of assets to transfer.
         * @param _fee:
         * @returns An object with n unique keys, each key being a destination address and the value of each key is equivalent to the sum of the equivalent assets received.
         */

        let _assets = assets;
        let containETH = !!_assets[NativeAssetId];

        if (containETH) {
            let value = bn(_fee).add(_assets[NativeAssetId]);
            _assets[NativeAssetId] = value;
        } else {
            _assets[NativeAssetId] = bn().add(_fee);
        }

        return Object.entries(_assets).map(([key, value]) => {
            return {
                amount: value,
                assetId: key
            };
        });
    }
}
