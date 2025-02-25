import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/users/user/schemas/user.schema';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UserStatusMiddleware implements NestMiddleware {
    constructor(@InjectModel(User.name) private userModel: Model<User>, private authService: AuthService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        try {
            var auth = req.headers.authorization;
            if (!!auth == false) {
                return false;
            }

            const token = auth.split(' ')[1];
            const decoded = await this.authService.verifyToken(token);
            const userId = decoded.userId;

            if (!userId) {
                throw new ForbiddenException('user_not_found');
            }

            const user = await this.userModel.findById(userId);

            const isBlockedByAdmin: boolean = user.isBlockedByAdmin || false;
            const userStatus: boolean = user.status || false;

            if (isBlockedByAdmin) {
                throw new ForbiddenException('user_blocked_admin_caption');
            }

            if (!userStatus) {
                throw new ForbiddenException('user_forbidden_caption');
            }

            next();
        }
        catch (e) {
            console.log('UserStatusMiddleware =================> ', e);
            if (e.message == 'user_blocked_admin_caption')
                throw new ForbiddenException('user_blocked_admin_caption');
            else if (e.message == 'user_forbidden_caption')
                throw new ForbiddenException('user_forbidden_caption');
            else
                throw new ForbiddenException(e.message);
        }
    }
}