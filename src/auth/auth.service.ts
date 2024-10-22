import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
    constructor(private configService: ConfigService) {}

    async decodeJWT(token: String, returnBoolOnError = false): Promise<any> {
        try {
            const decoded = jwt.decode(token.replace('Bearer ', ''));
            return decoded;
        } catch (error) {
            if(returnBoolOnError) return false;
            throw new HttpException(
                {
                    status: HttpStatus.NOT_ACCEPTABLE,
                    error: error.name,
                    message: error?.message ?? '',
                },
                HttpStatus.NOT_ACCEPTABLE,
            );
        }
    }

    async verifyToken(token: string, isAdmin: boolean = false, returnBoolOnError = false): Promise<any> {
        try {
            const decoded = jwt.verify(token, this.configService.get<string>(isAdmin ? 'jwt.adminSecret' : 'jwt.secret'));
            return decoded;
        } catch (error) {
            if(returnBoolOnError) return false;
            // show token expired exception
            if (error.name === 'TokenExpiredError') {
                throw new HttpException(
                    {
                        status: HttpStatus.UNAUTHORIZED,
                        error: 'Token is expired!',
                        message: 'Token is expired!',
                    },
                    HttpStatus.UNAUTHORIZED,
                );
            } else {
                throw new UnauthorizedException('Invalid token', error);
            }

        }
    }

    async generateToken(userId: string, refresh: boolean = false, isAdmin: boolean = false): Promise<string> {
        const token = jwt.sign({ userId }, this.configService.get<string>(isAdmin ? 'jwt.adminSecret' : 'jwt.secret'), {
            expiresIn: refresh ?
                this.configService.get<string>('jwt.refreshExpiresIn') :
                this.configService.get<string>('jwt.expiresIn')
        });
        return token;
    }

    hashPassword(password: string): string {
        return bcrypt.hashSync(password, 10);
    }

    async comparePasswords(dtoPassword: string, userPassword: string): Promise<boolean> {
        try {
            const result = await bcrypt.compare(dtoPassword, userPassword);
            return result;
        } catch (error) {
            console.error('Error comparing passwords:', error);
            return false;
        }
    }
}