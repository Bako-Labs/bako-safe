import { NativeAssetId } from 'fuels';
import { IAsset } from './types';

const assetsList: IAsset[] = [
    {
        name: 'Etherum',
        slug: 'ETH',
        assetId: NativeAssetId
    },
    {
        name: 'Dai',
        slug: 'DAI',
        assetId: '0x0d9be25f6bef5c945ce44db64b33da9235fbf1a9f690298698d899ad550abae1'
    },
    {
        name: 'sEther',
        slug: 'sETH',
        assetId: '0x1bdeed96ee1e5eca0bd1d7eeeb51d03b0202c1faf764fec1b276ba27d5d61d89'
    }
];

export { assetsList };
