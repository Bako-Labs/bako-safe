import axios, { AxiosInstance } from 'axios';

export class Api {
    public client: AxiosInstance;

    constructor(api: string, authToken: string) {
        this.client = axios.create({
            baseURL: api,
            headers: {
                Authorization: `Bearer ${authToken}`
            }
        });
    }
}
