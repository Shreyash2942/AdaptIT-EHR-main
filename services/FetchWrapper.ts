import { secureStorage } from '@/utils/secureStorage';
import { AccessTokenService } from './TokenService';

type FetchAPIOptions = Omit<RequestInit, 'method' | 'body'>;

export const fetchAPI = async (
  path: string,
  method: string,
  body: any | FormData = null,
  url: string | null = null,
  options: FetchAPIOptions = {}
) => {
  const isFormData = body instanceof FormData;
    try {
        let requestUrl = '';
        if(url){
            requestUrl = url + path;
        }else{
            let BASE_URL = await secureStorage.getItem('baseURL');
            if(!BASE_URL){throw new Error("URL not definded , please login")};
            requestUrl = BASE_URL + path;
        }
        const tokenService = await AccessTokenService.getInstance();
        const token = await tokenService.getToken();

        const controller = new AbortController();
        const signal = controller.signal;

        const headers: HeadersInit = {
          'User-Agent': 'adaptit/expo',
          'Authorization': 'AdaptITJWT',
          'Authorization-Token': token || '',
        };
        if (!isFormData) {
          headers['Content-Type'] = 'application/json';
        }
      
        const fetchPromise = fetch(requestUrl, {
            ...options,
            method: method,
            headers: headers,
            body: isFormData ? body : body ? JSON.stringify(body) : null,
            signal: signal,
          }).then(async (response) => {
            if (!response.ok) throw new Error(`${await response.json().then((data) => data.message) || 'Error in response format or missing error message.'}`);
            return await response.json();
          });
      
          return { promise: fetchPromise, controller };
    } catch (error) {

      throw new Error(`${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };