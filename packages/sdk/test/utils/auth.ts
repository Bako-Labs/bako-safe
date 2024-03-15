import { AuthService, IBSAFEAuth } from '../../src/api';

import { IAccountKeys, IDefaultAccount, accounts } from '../mocks';
export interface IAuthAccount extends IDefaultAccount {
  BSAFEAuth: IBSAFEAuth;
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
      BSAFEAuth: auth.BSAFEAuth!,
    };
  }

  return result;
};
