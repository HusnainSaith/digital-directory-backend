declare namespace Express {
  interface Request {
    country?: {
      id: string;
      code: string;
      name: string;
      subdomain: string;
    };
    userPermissions?: string[];
  }
}
