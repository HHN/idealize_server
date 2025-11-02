import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from '@nestjs/mongoose';
import { Model } from "mongoose";
import { AuthService } from "src/auth/auth.service";
import { CreateAdminDto, LoginAdminDto } from "../dtos/admin.dtos";
import { Admin, AdminDocument } from "../schemas/admin.schema";

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
        private authService: AuthService,
    ) { }

    async create(admin: CreateAdminDto): Promise<any> {

        const admins = await this.adminModel.countDocuments();

        if (admins > 0) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: 'Only one admin is allowed',
                    message: 'Only one admin is allowed',
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const existingUser = await this.adminModel
            .findOne({ email: admin.email.toLowerCase() })
            .exec();

        if (existingUser) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: 'Duplicate email',
                    message: 'The email provided is already registered',
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const updatedCreatedUserDTO = {
            ...admin,
            password: this.authService.hashPassword(admin.password),
        };

        const targetUser = new this.adminModel(updatedCreatedUserDTO);
        const createdUser = await targetUser.save();

        // update user's token
        const token = await this.authService.generateToken(createdUser._id.toString(), false, true);
        const refreshToken = await this.authService.generateToken(createdUser._id.toString(), true, true);

        // TODO Sh: PACKAGE UPDATE FIX - Mongoose 8.19.1 Type Issue
        // Changed from: ...updatedUser.toJSON() to: .lean() + Object.assign
        // Reason: Mongoose 8.19.1 has stricter TypeScript types that cause "union type too complex" 
        // errors when chaining .select().toJSON() with spread operator
        // Solution: Use .lean() to get plain JS object instead of toJSON()
        // @ts-ignore - Suppress TS2590: Expression produces a union type that is too complex to represent
        const query: any = this.adminModel
            .findByIdAndUpdate(createdUser._id,
                { status: true },
                { new: true }
            )
            .select('-password');
        
        const updatedUser = await query.lean().exec();

        return Object.assign({}, updatedUser, { token, refreshToken });
    }

    async login(user: LoginAdminDto): Promise<any> {
        const existingUser = await this.adminModel.findOne(
            {
                email: user.email.toLowerCase(),
                status: true
            })
            .select('+password')
            .exec();

        if (!existingUser) {
            throw new HttpException(
                {
                    status: HttpStatus.NOT_FOUND,
                    error: 'Admin not found',
                    message: 'Admin not found',
                },
                HttpStatus.NOT_FOUND,
            );
        }

        const isPasswordValid = await this.authService.comparePasswords(user.password, existingUser.password);
        if (!isPasswordValid) {
            throw new HttpException(
                {
                    status: HttpStatus.UNAUTHORIZED,
                    error: 'Invalid password',
                    message: 'Invalid password',
                },
                HttpStatus.UNAUTHORIZED,
            );
        }

        const token = await this.authService.generateToken(existingUser._id.toString(), false, true);
        const refreshToken = await this.authService.generateToken(existingUser._id.toString(), true, true);
        
        // TODO Shayan: PACKAGE UPDATE FIX - Mongoose 8.19.1 Type Issue (same as above)
        // @ts-ignore - Suppress TS2590: Expression produces a union type that is too complex to represent
        const updatedUser: any = await this.adminModel
            .findByIdAndUpdate(existingUser._id, { token, refreshToken }, { new: true })
            .select('-password')
            .lean()
            .exec();

        return {
            token,
            refreshToken,
            ...updatedUser
        };
    }

    async refreshToken(expiredToken: string, refreshToken: string): Promise<any> {
        // first check if the user already exists
        const jwtUser = await this.authService.decodeJWT(expiredToken);
        const refreshTokenValidation = await this.authService.decodeJWT(refreshToken);
        
        const existingUser = await this.adminModel
            .findOne({ _id: jwtUser.userId })
            .select('_id')
            .exec();

        if (existingUser) {

            if(refreshTokenValidation.userId !== existingUser._id.toString()) {
                throw new HttpException(
                    {
                        status: HttpStatus.UNAUTHORIZED,
                        error: 'Invalid token',
                        message: 'Invalid token',
                    },
                    HttpStatus.UNAUTHORIZED,
                );
            }

            // update user's token
            const newToken = await this.authService.generateToken(existingUser._id.toString(), false, true,);
            const newRefreshToken = await this.authService.generateToken(existingUser._id.toString(), true, true,);

            // TODO Shayan: PACKAGE UPDATE FIX - Mongoose 8.19.1 Type Issue (same as above)
            // @ts-ignore - Suppress TS2590: Expression produces a union type that is too complex to represent
            const userData: any = await this.adminModel
                .findOne({ _id: existingUser._id })
                .lean()
                .exec();

            return {
                token: newToken,
                refreshToken: newRefreshToken,
                ...userData
            };

        } else {
            throw new HttpException(
                {
                    status: HttpStatus.NOT_FOUND,
                    error: 'Incorrect Data',
                    message: 'Token is not valid!',
                },
                HttpStatus.NOT_FOUND,
            );
        }
    }
}

