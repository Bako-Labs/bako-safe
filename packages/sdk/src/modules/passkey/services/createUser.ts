import { client } from '../clientHttp';

export type CreateUserPayload = {
  address: string;
  type: TypeUser;
  provider: string;
  webauthn?: {
    id: string;
    publicKey: string;
    origin: string;
  };
};

export enum TypeUser {
  FUEL = 'FUEL',
  WEB_AUTHN = 'WEB_AUTHN',
}

export const createUserRequest = (
  payload: CreateUserPayload,
): Promise<{ code: string }> => {
  console.log('Payload enviado:', payload);

  return client('/user', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
    .then((response) => {
      console.log('Resposta recebida:', response);
      return response;
    })
    .catch((error) => {
      console.error('Erro na criação do usuário:', error);
      throw error;
    });
};
