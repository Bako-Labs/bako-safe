import { ProviderOptions } from 'fuels';
import { TypeUser } from 'src/api/auth/types';

export {
  ISelectWorkspaceResponse,
  IBakoSafeAuth,
  TypeUser,
  Workspace,
} from 'src/api/auth/types';

export type BakoProviderOptions = ProviderOptions & {
  token: string;
  address: string;
  challenge: string;
  encoder?: TypeUser;
  serverUrl?: string;
};
