import { Request } from 'express';

export interface UserPayload {
  registration: number;
  name: string;
  roles: string[];
}

export interface RequestWithUser extends Request {
  user: UserPayload;
}
