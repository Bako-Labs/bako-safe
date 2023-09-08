export type IAsset = {
    name: string;
    slug: string;
    assetId: string;
};

export type ITransferAsset = {
    assetId: string;
    amount: string;
    to: string;
};

export type IAssetGroupById = {
    [assetId: string]: {
        assetId: string;
        amount: number;
    };
};

export type IAssetGroupByTo = {
    [to: string]: {
        assetId: string;
        amount: number;
        to: string;
    };
};
