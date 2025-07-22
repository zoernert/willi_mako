// Simple test service to debug the module issue
export class UserService {
  async test(): Promise<string> {
    return 'test';
  }
}

export const userService = new UserService();
