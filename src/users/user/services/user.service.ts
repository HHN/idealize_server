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
import { EvaluationService } from 'src/evaluation/evaluation.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly authService: AuthService,
    private mailerServive: MailerService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private evaluationService: EvaluationService,
  ) { }


  /// TODO Shayan : Implement email validation against institution domains
  private validateEmailMatchesInstitution(email: string, institution: string): void {
    // Define institution email domains
   
    const institutionDomains: Record<string, string[]> = {
      'HHN - Hochschule Heilbronn': ['hs-heilbronn.de', 'stud.hs-heilbronn.de'],
      'IPAI': ['ip.ai'], 
      'Technische Universität München (TUM)': ['tum.de'], 
      'Heilbronn 42': ['42heilbronn.de', 'stud.42heilbronn.de'],
      'DHBW': ['dhbw.de'], 
      'Fraunhofer ISI': ['isi.fraunhofer.de'], 
      'Fraunhofer IAO': ['iao.fraunhofer.de', 'stud.iao.fraunhofer.de'],
    };

    // Get allowed domains for selected institution
    const allowedDomains = institutionDomains[institution];

    // If institution not found in mapping, allow any email (backward compatibility)
    if (!allowedDomains) {
      return;
    }

    // Extract domain from email
    const emailDomain = email.split('@')[1];

    // Check if email domain matches institution
    if (!allowedDomains.includes(emailDomain)) {
      const allowedDomainsString = allowedDomains.map(d => `@${d}`).join(' or ');
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Invalid email',
          message: `The email provided is not valid, please use your email from ${allowedDomainsString}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async create(createUserDto: CreateUserDto): Promise<any> {
    // Validate email matches institution if institution is provided
    if (createUserDto.institution) {
      this.validateEmailMatchesInstitution(createUserDto.email, createUserDto.institution);
    }

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
        // Expire code after 5 minutes
        const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

        existingUser.firstName = createUserDto.firstName;
        existingUser.lastName = createUserDto.lastName;
        existingUser.password = this.authService.hashPassword(createUserDto.password);
        // Store the verification code in hashed version
        existingUser.code = this.authService.hashPassword(code);
        existingUser.codeExpire = codeExpire;
        // TODO is SH: Persist overview field if provided during re-registration
        if (createUserDto.overview !== undefined) {
          existingUser.overview = createUserDto.overview;
        }

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

    // TODO is SH: Include overview in new user creation (Registration Step 3)
    // verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Expire code after 5 minutes
    const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

    const updatedCreatedUserDTO = {
      ...createUserDto,
      code: this.authService.hashPassword(code),
      codeExpire: codeExpire,
      password: this.authService.hashPassword(createUserDto.password),
      // TODO is SH: overview is already part of createUserDto, will be persisted automatically
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
      // Expire code after 5 minutes
      const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

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
        // TODO Sh: PACKAGE UPDATE FIX - Mongoose 8.19.1 Type Issue
        // Changed from: ...updatedUser.toJSON() to: .lean()
        // Reason: Mongoose 8.19.1 has stricter TypeScript types causing "union type too complex" 
        // errors with complex populated queries when using .toJSON() with spread operator
        // Solution: Use .lean() to get plain JS object directly from query
        // @ts-ignore - Suppress TS2590: Expression produces a union type that is too complex to represent
        .lean()
        .exec();

      return {
        token: token,
        refreshToken: refreshToken,
        ...updatedUser,
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
        // TODO Shayan: PACKAGE UPDATE FIX - Mongoose 8.19.1 Type Issue (same as above)
        // @ts-ignore - Suppress TS2590: Expression produces a union type that is too complex to represent
        .lean()
        .exec();

      return {
        token: newToken,
        refreshToken: newRefreshToken,
        ...userData,
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
        // Expire code after 5 minutes
        const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

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
        // TODO Shayan: PACKAGE UPDATE FIX - Mongoose 8.19.1 Type Issue (same as above)
        // @ts-ignore - Suppress TS2590: Expression produces a union type that is too complex to represent
        .lean()
        .exec();

      // Log first login for evaluation
      await this.evaluationService.logUserLogin(
        existingUser.firstName,
        existingUser.lastName,
        existingUser._id.toString()
      );

      return {
        token,
        refreshToken,
        ...updatedUser,
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
    // TODO is SH: Include overview in profile update (Profile Settings)
    await this.userModel.findOneAndUpdate({ _id: jwtUser.userId, softDeleted: false, isBlockedByAdmin: false, }, {
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      interestedCourses: updateUserDto.interestedCourses,
      interestedTags: updateUserDto.interestedTags,
      studyPrograms: updateUserDto.studyPrograms,
      username: updateUserDto.username,
      profilePicture: updateUserDto.profilePicture,
      recoveryEmail: updateUserDto.recoveryEmail,
      // TODO is SH: Allow updating overview via profile settings
      ...(updateUserDto.overview !== undefined && { overview: updateUserDto.overview }),
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

  async softDeleteUserRequest(token: string, useRecoveryEmail: boolean = false) {
    const jwtUser = await this.authService.decodeJWT(token);
    const existingUser = await this.userModel.findOne({
      _id: jwtUser.userId,
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
        match: { status: true, softDeleted: false, isBlockedByAdmin: false, _id: { $ne: jwtUser.userId } }
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
    // Expire code after 5 minutes
    const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

    existingUser.code = this.authService.hashPassword(code);
    existingUser.codeExpire = codeExpire;
    await existingUser.save();

    try {
      await this.mailerServive.sendSoftDeleteConfirmationEmail(
        useRecoveryEmail ? (existingUser.recoveryEmail ? existingUser.recoveryEmail : existingUser.email) : existingUser.email,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'otp_sent_success',
      user: {
        email: useRecoveryEmail ? (existingUser.recoveryEmail ? existingUser.recoveryEmail : existingUser.email) : existingUser.email,
      }
    };
  }

  async softAnonymizedDeleteUserRequest(token: string, useRecoveryEmail: boolean = false) {
    const jwtUser = await this.authService.decodeJWT(token);
    const existingUser = await this.userModel.findOne({
      _id: jwtUser.userId,
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
    // Expire code after 5 minutes
    const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

    existingUser.code = this.authService.hashPassword(code);
    existingUser.codeExpire = codeExpire;
    await existingUser.save();

    try {
      await this.mailerServive.sendSoftDeleteConfirmationEmail(
        useRecoveryEmail ? (existingUser.recoveryEmail ? existingUser.recoveryEmail : existingUser.email) : existingUser.email,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'otp_sent_success',
      user: {
        email: useRecoveryEmail ? (existingUser.recoveryEmail ? existingUser.recoveryEmail : existingUser.email) : existingUser.email,
      }
    };

  }

  async softKeepDataDeleteUserRequest(token: string, useRecoveryEmail: boolean = false) {
    const jwtUser = await this.authService.decodeJWT(token);
    const existingUser = await this.userModel.findOne({
      _id: jwtUser.userId,
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
    // Expire code after 5 minutes
    const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

    existingUser.code = this.authService.hashPassword(code);
    existingUser.codeExpire = codeExpire;
    await existingUser.save();

    try {
      await this.mailerServive.sendSoftDeleteConfirmationEmail(
        useRecoveryEmail ? (existingUser.recoveryEmail ? existingUser.recoveryEmail : existingUser.email) : existingUser.email,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'otp_sent_success',
      user: {
        email: useRecoveryEmail ? (existingUser.recoveryEmail ? existingUser.recoveryEmail : existingUser.email) : existingUser.email,
      }
    };

  }

  async verifySoftDeleteUser(deleteUserDto: DeleteUserDto, token: string, request: any, useRecoveryEmail: boolean = false) {
    const keepData: boolean = request.query.keep_data || false;

    const jwtUser = await this.authService.decodeJWT(token);

    const existingUser = await this.userModel.findOne({
      _id: jwtUser.userId,
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

    var userDbData = {
      firstName: 'unknown',
      lastName: 'unknown',
      username: 'unknown',
      email: this.authService.hashPassword(existingUser.email),
      softDeleted: true,
      isBlockedByAdmin: false,
      status: false,
    };

    if (keepData) {
      userDbData = {
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        username: existingUser.username,
        email: this.authService.hashPassword(existingUser.email),
        softDeleted: true,
        isBlockedByAdmin: false,
        status: false,
      };
    }

    const result = await this.userModel.findByIdAndUpdate(existingUser._id, userDbData).exec();

    try {
      await this.mailerServive.sendSoftDeletedSuccessEmail(
        useRecoveryEmail ? (existingUser.recoveryEmail ? existingUser.recoveryEmail : existingUser.email) : existingUser.email,
        `${existingUser.firstName} ${existingUser.lastName}`,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'user_deleted_success',
      user: {
        email: result.email,
      }
    };
  }

  async sendResetPasswordRequest(resetPasswordRequestDto: ResetPasswordRequestDto, useRecoveryEmail: boolean = false) {

    const existingUser = await this.userModel.findOne({
        email: resetPasswordRequestDto.email,
        softDeleted: false,
        isBlockedByAdmin: false,
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
    } else {
      if (existingUser.status === false) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Incorrect Data',
            message: 'User not verified!',
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    // verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Expire code after 5 minutes
    const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

    existingUser.code = this.authService.hashPassword(code);
    existingUser.codeExpire = codeExpire;
    await existingUser.save();

    try {
      await this.mailerServive.sendResetPasswordCodeEmail(
        useRecoveryEmail ? (existingUser.recoveryEmail ? existingUser.recoveryEmail : existingUser.email) : existingUser.email,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'OTP for reseting password sent successfully',
      user: {
        email: useRecoveryEmail ? (existingUser.recoveryEmail ? existingUser.recoveryEmail : existingUser.email) : existingUser.email,
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
    // TODO is SH: Allow admin to update user overview
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

    // TODO is SH: Include overview when admin creates users
    const updatedCreatedUserDTO = {
      ...createUserDto,
      password: this.authService.hashPassword(createUserDto.password),
      isBlockedByAdmin: false,
      softDeleted: false,
      status: false,
      // TODO is SH: overview is already part of createUserDto if provided
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
          userType: targetUser.userType,
          // TODO is SH: Return overview in admin create response
          overview: targetUser.overview,
        }
      },
    };
  }
}


