declare namespace Express {
  interface Request {
    superAdmin?: {
      userId: number;
      username: string;
      name: string;
    };
    clinicId?: number;
  }
}
