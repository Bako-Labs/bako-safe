import { ProviderOptions } from 'fuels';
import { TypeUser } from '../../api/auth/types';

export {
  ISelectWorkspaceResponse,
  IBakoSafeAuth,
  TypeUser,
  Workspace,
} from '../../api';

export type BakoProviderOptions = ProviderOptions & {
  token: string;
  address: string;
  challenge: string;
  encoder?: TypeUser;
  serverUrl?: string;
};

export type BakoProviderSetup = {
  address: string;
  encoder?: TypeUser;
  provider?: string;
};

export type BakoProviderAuth = {
  challenge: string;
  token: string;
  encoder?: TypeUser;
};
