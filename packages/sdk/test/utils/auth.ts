import { AuthService, IBakoSafeAuth } from '../../src/api';

import { IAccountKeys, IDefaultAccount, accounts } from '../mocks';
export interface IAuthAccount extends IDefaultAccount {
  BakoSafeAuth: IBakoSafeAuth;
}
export interface IUserAuth {
  [key: string]: IAuthAccount;
}
export const authService = async (
  _accounts: IAccountKeys[],
  provider: string,
) => {
  const result: { [key: string]: IAuthAccount } = {};
  for await (const acc of _accounts) {
    const account: IDefaultAccount = accounts[acc];
    const auth = await AuthService.create(acc, provider);

    result[acc] = {
      ...account,
      BakoSafeAuth: auth.BakoSafeAuth!,
    };
  }

  return result;
};
