import { NativeAssetId, bn } from 'fuels';
import { IAssetGroupById, IAssetGroupByTo, ITransferAsset } from './types';

export class Asset {
    public static async assetsGroupById(list: ITransferAsset[]) {
        return list.reduce((acc: IAssetGroupById, asset: ITransferAsset) => {
            const { assetId, amount }: { assetId: string; amount: string } = asset;

            if (!acc[assetId]) {
                acc[assetId] = {
                    assetId,
                    amount: parseFloat(amount)
                };
            } else {
                acc[assetId].amount += parseFloat(amount);
            }

            return acc;
        }, {}) as IAssetGroupById;
    }

    public static async assetsGroupByTo(list: ITransferAsset[]) {
        return list.reduce((acc: IAssetGroupByTo, asset: ITransferAsset) => {
            const { to, amount, assetId }: ITransferAsset = asset;

            if (!acc[`${to}${assetId}`]) {
                acc[`${to}${assetId}`] = {
                    assetId,
                    amount: parseFloat(amount),
                    to
                };
            } else {
                acc[`${to}${assetId}`].amount += parseFloat(amount);
            }
            return acc;
        }, {}) as IAssetGroupByTo;
    }

    public static async addTransactionFee(assets: IAssetGroupById, _fee: string) {
        let _assets = assets;
        let containETH = !!_assets[NativeAssetId];

        if (containETH) {
            let value = bn().add(bn(1)).add(bn.parseUnits(_assets[NativeAssetId].amount.toString()));
            _assets[NativeAssetId].amount = parseFloat(value.format());
        } else {
            let value = bn().add(bn(10000));

            _assets[NativeAssetId] = {
                assetId: NativeAssetId,
                amount: Number(parseFloat(value.format()).toFixed(20).toString())
            };
        }

        return Object.entries(_assets).map(([key, value]) => {
            return {
                amount: bn.parseUnits(value.amount.toString()),
                assetId: key
            };
        });
    }
}
