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

        const updatedUser = await this.adminModel
            .findByIdAndUpdate(createdUser._id,
                { token, refreshToken, status: true },
                { new: true }
            )
            .select('-password +refreshToken +token');


        return updatedUser;
    }

    async login(user: LoginAdminDto): Promise<Admin> {
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
        const updatedUser = await this.adminModel
            .findByIdAndUpdate(existingUser._id, { token, refreshToken }, { new: true })
            .select('-password +refreshToken +token');

        updatedUser.token = token;
        return updatedUser;
    }

    async refreshToken(expiredToken: string, refreshToken: string): Promise<any> {
        // first check if the user already exists
        const jwtUser = await this.authService.decodeJWT(expiredToken);

        const existingUser = await this.adminModel
            .findOne({ _id: jwtUser.userId, refreshToken })
            .select('_id')
            .exec();

        if (existingUser) {
            // update user's token
            const newToken = await this.authService.generateToken(existingUser._id.toString(), false, true,);
            const newRefreshToken = await this.authService.generateToken(existingUser._id.toString(), true, true,);

            await this.adminModel
                .findByIdAndUpdate(
                    existingUser._id,
                    { token: newToken, refreshToken: newRefreshToken },
                    { new: true, }
                )
                .exec();

            return await this.adminModel
                .findOne({ _id: existingUser._id })
                .select('+token +refreshToken')
                .exec();

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

