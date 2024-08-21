import axios, { Axios } from 'axios';

export type ApiConfigurable = {
  address?: string;
  signature?: string;
  serverUrl?: string;
};

export const axiosConfig = ({ address, signature, url }: any) => {
  return axios.create({
    baseURL: url ?? 'http://localhost:3333',
    headers: {
      Authorization: signature,
      'Signer-Address': address,
    },
  });
};

export class Api {
  public autenticate(address: string, signature: string) {
    //@ts-ignore
    this.defaults.headers['Authorization'] = signature;
    //@ts-ignore
    this.defaults.headers['Signer-Address'] = address;

    return;
  }

  public generateChallenge() {}
}
