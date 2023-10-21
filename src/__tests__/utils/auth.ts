import { AuthService, IBSAFEAuth } from '../../library/api/auth';
import { defaultConfigurable } from '../../library/configurables';
import { IAccountKeys, IDefaultAccount, accounts } from '../../mocks/accounts';
export interface IAuthAccount extends IDefaultAccount {
    BSAFEAuth: IBSAFEAuth;
}
export interface IUserAuth {
    [key: string]: IAuthAccount;
}
export const authService = async (_accounts: IAccountKeys[]) => {
    const result: { [key: string]: IAuthAccount } = {};
    for await (const acc of _accounts) {
        const account: IDefaultAccount = accounts[acc];
        const auth = new AuthService();
        await auth.createUser(account, defaultConfigurable['provider']);
        await auth.createSession();

        result[acc] = {
            ...account,
            BSAFEAuth: auth.BSAFEAuth!
        };
    }

    return result;
};
