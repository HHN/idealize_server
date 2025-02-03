import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dtos/create-user.dto';
import { AuthService } from 'src/auth/auth.service';
import { LoginUserDto } from '../dtos/login-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { MailerService } from "src/mailer/mailer.service";
import { VerifyUserDto } from '../dtos/verify-user.dto';
import { ResendCodeDto } from '../dtos/resend-code.dto';
import { DeleteUserDto } from '../dtos/delete-user.dto';
import { ResetPasswordDto, ResetPasswordRequestDto } from '../dtos/reset-password.dto';
import { UpdateUserByAdminDto } from '../dtos/update-user-by-admin.dto';
import { Project, ProjectDocument } from 'src/projects/project/schemas/project.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly authService: AuthService,
    private mailerServive: MailerService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<any> {
    // first check if the user already exists
    const existingUser = await this.userModel.findOne({ email: createUserDto.email.toLowerCase() }).exec();

    if (existingUser) {

      if (existingUser.status === true) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Duplicate email',
            message: 'The email provided is already registered',
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        //update new data and resend OTP

        // verification code
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        // Expire code after 2 minutes
        const codeExpire = new Date(Date.now() + 2 * 60 * 1000);

        existingUser.firstName = createUserDto.firstName;
        existingUser.lastName = createUserDto.lastName;
        existingUser.password = this.authService.hashPassword(createUserDto.password);
        // Store the verification code in hashed version
        existingUser.code = this.authService.hashPassword(code);
        existingUser.codeExpire = codeExpire;

        await existingUser.save();

        try {
          await this.mailerServive.sendVerificationEmail(
            createUserDto.email,
            `${createUserDto.firstName} ${createUserDto.lastName}`,
            code,
          );
        } catch (er) {
          console.log(er);
        }

        return {
          message: 'OTP resent successfully',
          user: {
            email: createUserDto.email,
          }
        };
      }

    }

    // verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Expire code after 2 minutes
    const codeExpire = new Date(Date.now() + 2 * 60 * 1000);

    const updatedCreatedUserDTO = {
      ...createUserDto,
      code: this.authService.hashPassword(code),
      codeExpire: codeExpire,
      password: this.authService.hashPassword(createUserDto.password),
    };

    const targetUser = new this.userModel(updatedCreatedUserDTO);
    await targetUser.save();

    try {
      await this.mailerServive.sendVerificationEmail(
        createUserDto.email,
        `${createUserDto.firstName} ${createUserDto.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'User created successfully',
      user: {
        email: createUserDto.email,
      }
    };
  }

  async resendCode(resendDto: ResendCodeDto): Promise<any> {

    const existingUser = await this.userModel
      .findOne({ email: resendDto.email.toLowerCase(), status: false })
      .select('+code +codeExpire')
      .exec();

    if (existingUser) {

      // verification code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      // Expire code after 2 minutes
      const codeExpire = new Date(Date.now() + 2 * 60 * 1000);

      existingUser.code = this.authService.hashPassword(code);
      existingUser.codeExpire = codeExpire;
      await existingUser.save();

      try {
        await this.mailerServive.sendVerificationEmail(
          resendDto.email,
          `${existingUser.firstName} ${existingUser.lastName}`,
          code,
        );
      } catch (er) {
        console.log(er);
      }

      return {
        message: 'OTP resent successfully',
        user: {
          email: existingUser.email,
        }
      };

    } else {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'User does not exist!',
          message: 'User does not exist!',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async verify(verifyUserDto: VerifyUserDto): Promise<any> {
    const existingUser = await this.userModel
      .findOne({
        email: verifyUserDto.email.toLowerCase(),
        status: false,
      })
      .select('+code +codeExpire')
      .exec();

    if (existingUser) {

      if (existingUser.codeExpire < (new Date())) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Code is expired!',
            message: 'Code is expired!',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!await this.authService.comparePasswords(verifyUserDto.code, existingUser.code)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: 'Code is invalid!',
            message: 'Code is invalid!',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // update user's token
      const token = await this.authService.generateToken(existingUser._id.toString());
      const refreshToken = await this.authService.generateToken(existingUser._id.toString(), true);

      existingUser.status = true;
      existingUser.code = null;
      existingUser.codeExpire = null;

      await existingUser.save();

      const updatedUser = await this.userModel.findById(existingUser._id)
        .populate({
          path: 'profilePicture',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedTags',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedCourses',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'studyPrograms',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .exec();

      return {
        token: token,
        refreshToken: refreshToken,
        ...updatedUser.toJSON(),
      };

    } else {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Incorrect Data',
          message: 'User not found!',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async refreshToken(expiredToken: string, refreshToken: string): Promise<any> {
    // first check if the user already exists
    const jwtUser = await this.authService.decodeJWT(expiredToken);
    const refreshTokenValidation = await this.authService.decodeJWT(refreshToken);

    const existingUser = await this.userModel
      .findOne({ _id: jwtUser.userId })
      .select('_id')
      .exec();

    if (existingUser) {

      if (refreshTokenValidation.userId !== existingUser._id.toString()) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: 'Invalid refresh token',
            message: 'Invalid refresh token',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (existingUser.isBlockedByAdmin) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: 'User is blocked by admin',
            message: 'User is blocked by admin',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (existingUser.softDeleted) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: 'User is deleted',
            message: 'User is deleted',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (existingUser.status === false) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: 'User is not verified',
            message: 'User is not verified',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      // update user's token
      const newToken = await this.authService.generateToken(existingUser._id.toString());
      const newRefreshToken = await this.authService.generateToken(existingUser._id.toString(), true);

      const userData = await this.userModel
        .findOne({ _id: existingUser._id })
        .populate({
          path: 'profilePicture',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedTags',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedCourses',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'studyPrograms',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .select('+profilePicture')
        .exec();

      return {
        token: newToken,
        refreshToken: newRefreshToken,
        ...userData.toJSON(),
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

  async login(loginUserDto: LoginUserDto): Promise<any> {
    // first check if the user already exists
    const existingUser = await this.userModel
      .findOne({ email: loginUserDto.email.toLowerCase(), })
      .select('+password +isBlockedByAdmin +softDeleted')
      .exec();
    if (existingUser) {

      if (existingUser.softDeleted === true) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: 'You account has been deleted!',
            message: 'You account has been deleted!',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (existingUser.isBlockedByAdmin === true) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: 'You are blocked by admin!',
            message: 'You are blocked by admin!',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (existingUser.status === false) {
        // update new data and resend OTP

        // verification code
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        // Expire code after 2 minutes
        const codeExpire = new Date(Date.now() + 2 * 60 * 1000);

        existingUser.code = this.authService.hashPassword(code);
        existingUser.codeExpire = codeExpire;
        await existingUser.save();

        try {
          await this.mailerServive.sendVerificationEmail(
            existingUser.email,
            `${existingUser.firstName} ${existingUser.lastName}`,
            code,
          );
        } catch (er) {
          console.log(er);

          throw new HttpException(
            {
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              error: 'Server error',
              message: 'Server error!',
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        throw new HttpException(
          {
            status: HttpStatus.METHOD_NOT_ALLOWED,
            error: 'You are not verified!',
            message: 'Please verify your account first!',
          },
          HttpStatus.METHOD_NOT_ALLOWED,
        );
      }


      const passwordCheck = await this.authService.comparePasswords(loginUserDto.password, existingUser.password);

      if (!passwordCheck) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Incorrect Data',
            message: 'Email or password is incorrect!',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // update user's token
      const token = await this.authService.generateToken(existingUser._id.toString());
      const refreshToken = await this.authService.generateToken(existingUser._id.toString(), true);

      const updatedUser = await this.userModel
        .findById(existingUser._id)
        .select('+profilePicture')
        .populate('interestedTags')
        .populate({
          path: 'profilePicture',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedTags',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedCourses',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'studyPrograms',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .exec();

      return {
        token,
        refreshToken,
        ...updatedUser.toJSON(),
      };

    } else {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Incorrect Data',
          message: 'Email or password is incorrect!',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async findAll(asAdmin: boolean = false, requestQuery = null): Promise<User[]> {

    if (requestQuery === null) requestQuery = { sortField: 'createdAt', sort: 'asc' };

    const sortField = requestQuery.sortField ? requestQuery.sortField : 'createdAt';
    const sortOrder = requestQuery.sort === 'desc' ? -1 : 1;

    return this.userModel.find(asAdmin ? {} : { status: true, softDeleted: false, isBlockedByAdmin: false, })
      .populate({
        path: 'profilePicture',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      })
      .populate({
        path: 'interestedTags',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      })
      .populate({
        path: 'interestedCourses',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      })
      .populate({
        path: 'studyPrograms',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      })
      .select(asAdmin ? '+isBlockedByAdmin +softDeleted +code +codeExpire' : '-code -codeExpire')
      .sort({ [sortField]: sortOrder })
      .exec();
  }

  async findById(id: string): Promise<User> {
    try {
      return this.userModel.findOne({ _id: new ObjectId(id), status: true, softDeleted: false, isBlockedByAdmin: false, })
        .populate({
          path: 'profilePicture',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedTags',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedCourses',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'studyPrograms',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .exec();
    }
    catch (er) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Incorrect Data',
          message: 'User not found!',
        },
        HttpStatus.NOT_FOUND,
      )
    }
  }

  async findByIdAsAdmin(id: string): Promise<User> {
    try {
      return this.userModel.findOne({ _id: new ObjectId(id) })
        .populate({
          path: 'profilePicture',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedTags',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'interestedCourses',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .populate({
          path: 'studyPrograms',
          populate: { path: 'user', select: '_id firstName lastName email userType' }
        })
        .select('+isBlockedByAdmin +softDeleted +code +codeExpire')
        .exec();
    }
    catch (er) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Incorrect Data',
          message: 'User not found!',
        },
        HttpStatus.NOT_FOUND,
      )
    }
  }

  async update(updateUserDto: UpdateUserDto, token: string): Promise<User> {
    const jwtUser = await this.authService.decodeJWT(token);
    await this.userModel.findOneAndUpdate({ _id: jwtUser.userId, softDeleted: false, isBlockedByAdmin: false, }, {
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      interestedCourses: updateUserDto.interestedCourses,
      interestedTags: updateUserDto.interestedTags,
      studyPrograms: updateUserDto.studyPrograms,
      username: updateUserDto.username,
      profilePicture: updateUserDto.profilePicture
    });

    return await this.userModel.findById(jwtUser.userId)
      .populate({
        path: 'profilePicture',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      })
      .populate({
        path: 'interestedTags',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      })
      .populate({
        path: 'interestedCourses',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      })
      .populate({
        path: 'studyPrograms',
        populate: { path: 'user', select: '_id firstName lastName email userType' }
      })
      .select('+profilePicture')
      .exec();
  }

  async delete(id: string): Promise<User> {
    return this.userModel.findByIdAndUpdate(id, {
      softDeleted: true,
      isBlockedByAdmin: true,
      firstName: 'Unknown',
      lastName: 'Unknown',
    }).exec();
  }

  async block(id: string): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(id, { isBlockedByAdmin: true }, { new: true }).exec();

    // invalidate tokens
    await this.authService.generateToken(user._id.toString());
    await this.authService.generateToken(user._id.toString(), true);

    return user;
  }

  async unblock(id: string): Promise<User> {
    return this.userModel.findByIdAndUpdate(id, { isBlockedByAdmin: false, }, { new: true }).exec();
  }

  async activate(id: string): Promise<User> {
    return this.userModel.findByIdAndUpdate(id, { status: true, }, { new: true }).exec();
  }

  async deactivate(id: string): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(id, { status: false }, { new: true }).exec();

    // invalidate tokens
    await this.authService.generateToken(user._id.toString());
    await this.authService.generateToken(user._id.toString(), true);

    return user;
  }

  async softDeleteUser(token: string) {
    const jwtUser = await this.authService.decodeJWT(token);
    const existingUser = await this.userModel.findByIdAndUpdate(jwtUser.userId, {
      softDeleted: false,
      isBlockedByAdmin: false,
      status: true
    }).exec();

    if (!existingUser) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Incorrect Data',
          message: 'User not found!',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const userProjects = await this.projectModel.find({
      owner: jwtUser.userId,
      teamMembers: { $exists: true, $ne: [] }
    })
      .populate({
        path: 'teamMembers',
        select: '_id, firstName lastName email userType',
      })
      .exec();

    if (userProjects.length > 0) {
      return {
        message: 'soft_delete_projects_exists',
        data: {
          projects: userProjects
        }
      };
    }

    // verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Expire code after 2 minutes
    const codeExpire = new Date(Date.now() + 2 * 60 * 1000);

    existingUser.code = this.authService.hashPassword(code);
    existingUser.codeExpire = codeExpire;
    await existingUser.save();

    try {
      await this.mailerServive.sendSoftDeleteConfirmationEmail(
        existingUser.email,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'otp_sent_success',
      user: {
        email: existingUser.email,
      }
    };
  }

  async verifySoftDeleteUser(deleteUserDto: DeleteUserDto, token: string) {
    const jwtUser = await this.authService.decodeJWT(token);

    const existingUser = await this.userModel.findByIdAndUpdate(jwtUser.userId, {
      softDeleted: false,
      isBlockedByAdmin: false,
      status: true
    })
      .select('+code +codeExpire')
      .exec();

    if (!existingUser) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Incorrect Data',
          message: 'User not found!',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (existingUser.codeExpire < (new Date())) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Code is expired!',
          message: 'Code is expired!',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!await this.authService.comparePasswords(deleteUserDto.code, existingUser.code)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Code is invalid!',
          message: 'Code is invalid!',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.userModel.findByIdAndUpdate(existingUser._id, {
      firstName: 'unknown',
      lastName: 'unknown',
      username: 'unknown',
      email: 'unknown',
      softDeleted: true,
    }).exec();

    return {
      message: 'user_deleted_success',
      user: {
        email: result.email,
      }
    };
  }

  async sendResetPasswordRequest(resetPasswordRequestDto: ResetPasswordRequestDto) {

    const existingUser = await this.userModel.findOneAndUpdate({ email: resetPasswordRequestDto.email, softDeleted: false, isBlockedByAdmin: false, }, {
      softDeleted: false,
      isBlockedByAdmin: false,
      status: true
    }).exec();

    if (!existingUser) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Incorrect Data',
          message: 'User not found!',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Expire code after 2 minutes
    const codeExpire = new Date(Date.now() + 2 * 60 * 1000);

    existingUser.code = this.authService.hashPassword(code);
    existingUser.codeExpire = codeExpire;
    await existingUser.save();

    try {
      await this.mailerServive.sendResetPasswordCodeEmail(
        existingUser.email,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'OTP for reseting password sent successfully',
      user: {
        email: existingUser.email,
      }
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const existingUser = await this.userModel.findOneAndUpdate({ email: resetPasswordDto.email, softDeleted: false, isBlockedByAdmin: false, }, {
      softDeleted: false,
      isBlockedByAdmin: false,
      status: true
    })
      .select('+code +codeExpire')
      .exec();

    if (!existingUser) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Incorrect Data',
          message: 'User not found!',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (existingUser.codeExpire < (new Date())) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Code is expired!',
          message: 'Code is expired!',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!await this.authService.comparePasswords(resetPasswordDto.code, existingUser.code)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Code is invalid!',
          message: 'Code is invalid!',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.userModel.findByIdAndUpdate(existingUser._id, {
      password: this.authService.hashPassword(resetPasswordDto.newPassword),
      code: null,
      codeExpire: null,
    }).exec();
  }

  async editByAdmin(userId: string, updateUserByAdminDto: UpdateUserByAdminDto): Promise<User> {
    return await this.userModel.findByIdAndUpdate(userId, updateUserByAdminDto).exec();
  }

  async createByAdmin(createUserDto: CreateUserDto): Promise<any> {
    // first check if the user already exists
    const existingUser = await this.userModel.findOne({ email: createUserDto.email.toLowerCase() }).exec();

    if (existingUser) {

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Duplicate email',
          message: 'The email provided is already created',
        },
        HttpStatus.BAD_REQUEST,
      );

    }

    const updatedCreatedUserDTO = {
      ...createUserDto,
      password: this.authService.hashPassword(createUserDto.password),
      isBlockedByAdmin: false,
      softDeleted: false,
      status: false,
    };

    const targetUser = new this.userModel(updatedCreatedUserDTO);
    await targetUser.save();

    return {
      message: 'User created successfully',
      data: {
        user: {
          _id: targetUser._id,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          username: targetUser.username,
          status: targetUser.status,
          isBlockedByAdmin: targetUser.isBlockedByAdmin,
          softDeleted: targetUser.softDeleted,
          userType: targetUser.userType
        }
      },
    };
  }
}


