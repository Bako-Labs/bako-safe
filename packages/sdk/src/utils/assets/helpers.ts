import { assets } from '../../../test/mocks';
import type { IAsset } from './types';
const assetsList: IAsset[] = [
  {
    name: 'Etherum',
    slug: 'ETH',
    assetId: assets.ETH,
  },
  {
    name: 'Dai',
    slug: 'DAI',
    // @ts-ignore
    assetId: assets.DAI,
  },
  {
    name: 'sEther',
    slug: 'sETH',
    // @ts-ignore
    assetId: assets.sETH,
  },
];

export { assetsList };
