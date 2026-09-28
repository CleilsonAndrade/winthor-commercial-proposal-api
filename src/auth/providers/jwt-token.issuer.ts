import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedPrincipal } from '../interfaces/authenticated-principal.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { TokenIssuer } from '../interfaces/token-issuer.interface';

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly jwtService: JwtService) {}

  issue(principal: AuthenticatedPrincipal): string {
    const payload: JwtPayload = {
      registration: principal.registration,
      name: principal.displayName,
      roles: principal.roles,
      status: principal.status,
    };

    return this.jwtService.sign(payload);
  }
}
