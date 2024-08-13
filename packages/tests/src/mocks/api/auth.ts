import {
  IAuthCreateRequest,
  IAuthCreateResponse,
  IAuthSignRequest,
  IAuthSignResponse,
  ISelectWorkspaceResponse,
  IBakoSafeAuth,
} from 'bakosafe/src/api/auth/types';
import { randomUUID } from 'crypto';
import { Address, hashMessage, Signer } from 'fuels';
import { random_user_avatar } from '../avatars';
import { findById, workspace } from '../workspaces';

export const mockAuthService = {
  auth: jest.fn<Promise<IAuthCreateResponse>, [IAuthCreateRequest]>(),
  sign: jest.fn<Promise<IAuthSignResponse>, [IAuthSignRequest]>(),
  selectWorkspace: jest.fn<Promise<ISelectWorkspaceResponse>, [string]>(),
  getWorkspaces: jest.fn<Promise<ISelectWorkspaceResponse[]>, []>(),
  setAuth: jest.fn<void, [IBakoSafeAuth]>(),
};

// Implementação dos mocks utilizando os parâmetros da request:
mockAuthService.auth.mockImplementation((params: IAuthCreateRequest) => {
  return new Promise((resolve, _) => {
    resolve({
      code: Address.fromRandom().toB256(),
      validAt: new Date().toISOString(),
      origin: 'random-origin',
    });
  });
});

mockAuthService.sign.mockImplementation((params: IAuthSignRequest) => {
  const { digest, encoder, signature } = params;

  return new Promise((resolve, _) => {
    resolve({
      accessToken: signature,
      address: Signer.recoverAddress(
        hashMessage(digest),
        signature,
      ).toAddress(),
      avatar: random_user_avatar(),
      user_id: randomUUID(),
      workspace: workspace['WORKSPACE_1'],
    });
  });
});

mockAuthService.selectWorkspace.mockImplementation((workspaceId: string) => {
  return new Promise((resolve, reject) => {
    const workspace = findById(workspaceId);
    if (workspace) {
      resolve(workspace);
    }
    reject(new Error('Workspace not found'));
  });
});

mockAuthService.getWorkspaces.mockImplementation(() => {
  return new Promise((resolve, _) => {
    resolve(
      Object.keys(workspace).map((key) => {
        return workspace[key];
      }),
    );
  });
});

// Exporta o mock para ser usado nos testes
export default mockAuthService;
