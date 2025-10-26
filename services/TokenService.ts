
import { secureStorage } from '@/utils/secureStorage';

export class AccessTokenService {
  private static instance : AccessTokenService;
  private tokenKey : string = 'ACCESS_TOKEN';
  private accessToken : string | null= null;
  private secureStorage = secureStorage;
  private constructor() {
    
  }

  public static async getInstance(): Promise<AccessTokenService> {
    if (!AccessTokenService.instance) {
      AccessTokenService.instance = new AccessTokenService();
      AccessTokenService.instance.accessToken = await AccessTokenService.instance.secureStorage.getItem(AccessTokenService.instance.tokenKey);
    }
    return AccessTokenService.instance;
  }

  public async setToken (token : string): Promise<void>{
    if(token.length > 0){
      await this.secureStorage.setItem(this.tokenKey, token);
      this.accessToken = token;
    }
  }

  public async getToken (): Promise<string | null>{
    //let token = await this.tokenManager.getItem(this.tokenKey);
    return this.accessToken;
  }

  public async destoryToken() :Promise<void>{
    this.secureStorage.removeItem(this.tokenKey);
  }
}
