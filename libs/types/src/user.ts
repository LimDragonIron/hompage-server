import { User } from '@prisma/client';

export interface UserIdentifier {
  id: string;
  email: string;
}

export interface SignInResponse {
  user: Partial<User>;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface SigInResult extends SignInResponse, Tokens {}
