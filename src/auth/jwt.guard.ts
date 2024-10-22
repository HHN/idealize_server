import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    try {

      if (!!request.headers == false) {
        return false;
      }

      if (!!(request.headers.authorization) == false) {
        return false;
      }

      const token = request.headers.authorization.split(' ')[1];
      const decoded = await this.authService.verifyToken(token);

      request.user = decoded;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

@Injectable()
export class JwtAdminAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    try {
      if (!!(request.headers.authorization) == false) {
        return false;
      }

      const token = request.headers.authorization.split(' ')[1];
      const decoded = await this.authService.verifyToken(token, true);
      request.user = decoded;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

@Injectable()
export class JwtAdminOrUserAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    try {
      if (!!(request.headers.authorization) == false) {
        return false;
      }

      const token = request.headers.authorization.split(' ')[1];
      const userCheck = await this.authService.verifyToken(token, false, true);
      const adminCheck = await this.authService.verifyToken(token, true, true);

      if (userCheck === false && adminCheck === false) {
        throw new UnauthorizedException();
      }

      request.user = userCheck === false ? adminCheck : userCheck;

      return true;
    } catch (error) {
      throw error;
    }
  }
}
