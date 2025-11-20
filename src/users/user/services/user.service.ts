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
//TODO SH: GDPR encryption - import EncryptionService for email encryption
import { EncryptionService } from 'src/encryption/encryption.service';
//TODO SH: GDPR encryption - import email normalization utility
import { normalizeEmail } from 'src/shared/utils/email.utils';

@Injectable()
export class UsersService {
  constructor(
    private readonly authService: AuthService,
    private mailerServive: MailerService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    //TODO SH: GDPR encryption - inject EncryptionService for PII operations
    private readonly encryptionService: EncryptionService,
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

    //TODO SH: GDPR encryption - normalize email before HMAC lookup and encryption
    const normalizedEmail = normalizeEmail(createUserDto.email);
    const hashedEmail = this.encryptionService.hmacIndex(normalizedEmail);

    //TODO SH: GDPR encryption - lookup by HMAC index only (post-cutover)
    const existingUser = await this.userModel.findOne({ hashedEmail }).exec();

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

        //TODO SH: GDPR encryption v2 - encrypt all PII fields
        existingUser.firstName_enc = this.encryptionService.encrypt(createUserDto.firstName);
        existingUser.lastName_enc = this.encryptionService.encrypt(createUserDto.lastName);
        existingUser.userType_enc = this.encryptionService.encrypt(createUserDto.userType);
        
        // Keep plaintext for backwards compatibility (temporary migration period)
        existingUser.firstName = createUserDto.firstName;
        existingUser.lastName = createUserDto.lastName;
        existingUser.userType = createUserDto.userType;
        
        existingUser.password = this.authService.hashPassword(createUserDto.password);
        // Store the verification code in hashed version
        existingUser.code = this.authService.hashPassword(code);
        existingUser.codeExpire = codeExpire;
        
        //TODO SH: GDPR encryption - update encrypted fields only (post-cutover)
        existingUser.hashedEmail = hashedEmail;
        existingUser.email_enc = this.encryptionService.encrypt(normalizedEmail);
        
        //TODO SH: GDPR encryption v2 - encrypt optional fields if provided
        if (createUserDto.username) {
          existingUser.username_enc = this.encryptionService.encrypt(createUserDto.username);
          existingUser.username = createUserDto.username; // Keep plaintext temporarily
        }
        
        if (createUserDto.institution) {
          existingUser.institution_enc = this.encryptionService.encrypt(createUserDto.institution);
          existingUser.institution = createUserDto.institution; // Keep plaintext temporarily
        }
        
        if (createUserDto.overview !== undefined) {
          existingUser.overview_enc = this.encryptionService.encrypt(createUserDto.overview || '');
          existingUser.overview = createUserDto.overview; // Keep plaintext temporarily
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

    //TODO SH: GDPR encryption v2 - encrypt all PII fields for new user
    const firstName_enc = this.encryptionService.encrypt(createUserDto.firstName);
    const lastName_enc = this.encryptionService.encrypt(createUserDto.lastName);
    const userType_enc = this.encryptionService.encrypt(createUserDto.userType);
    const email_enc = this.encryptionService.encrypt(normalizedEmail);
    
    // Encrypt optional fields
    const username_enc = createUserDto.username ? this.encryptionService.encrypt(createUserDto.username) : undefined;
    const institution_enc = createUserDto.institution ? this.encryptionService.encrypt(createUserDto.institution) : undefined;
    const overview_enc = createUserDto.overview ? this.encryptionService.encrypt(createUserDto.overview) : undefined;

    const updatedCreatedUserDTO = {
      ...createUserDto,
      hashedEmail, //TODO SH: GDPR encryption - HMAC index for lookups
      email_enc, //TODO SH: GDPR encryption - encrypted email
      firstName_enc, //TODO SH: GDPR encryption v2 - encrypted firstName
      lastName_enc, //TODO SH: GDPR encryption v2 - encrypted lastName
      userType_enc, //TODO SH: GDPR encryption v2 - encrypted userType
      username_enc, //TODO SH: GDPR encryption v2 - encrypted username
      institution_enc, //TODO SH: GDPR encryption v2 - encrypted institution
      overview_enc, //TODO SH: GDPR encryption v2 - encrypted overview
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
    //TODO SH: GDPR encryption - normalize email and compute HMAC for lookup
    const normalizedEmail = normalizeEmail(resendDto.email);
    const hashedEmail = this.encryptionService.hmacIndex(normalizedEmail);

    //TODO SH: GDPR encryption - lookup by HMAC index only (post-cutover)
    const existingUser = await this.userModel
      .findOne({ hashedEmail, status: false })
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
          email: resendDto.email, //TODO SH: GDPR encryption - use input email (already normalized)
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
    //TODO SH: GDPR encryption - normalize email and compute HMAC for lookup (post-cutover)
    const normalizedEmail = normalizeEmail(verifyUserDto.email);
    const hashedEmail = this.encryptionService.hmacIndex(normalizedEmail);

    const existingUser = await this.userModel
      .findOne({
        hashedEmail,
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

      //TODO SH: GDPR encryption v2 - select all encrypted PII fields for response
      const updatedUser = await this.userModel.findById(existingUser._id)
        .select('+email_enc +recoveryEmail_enc +firstName_enc +lastName_enc +username_enc +userType_enc +institution_enc +overview_enc')
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

      //TODO SH: GDPR encryption v2 - decrypt all PII fields for response compatibility
      const decryptedEmail = this.encryptionService.decrypt(updatedUser.email_enc);
      const decryptedRecoveryEmail = updatedUser.recoveryEmail_enc
        ? this.encryptionService.decrypt(updatedUser.recoveryEmail_enc)
        : undefined;
      const decryptedFirstName = this.encryptionService.decrypt(updatedUser.firstName_enc);
      const decryptedLastName = this.encryptionService.decrypt(updatedUser.lastName_enc);
      const decryptedUserType = this.encryptionService.decrypt(updatedUser.userType_enc);
      const decryptedUsername = updatedUser.username_enc ? this.encryptionService.decrypt(updatedUser.username_enc) : '';
      const decryptedInstitution = updatedUser.institution_enc ? this.encryptionService.decrypt(updatedUser.institution_enc) : '';
      const decryptedOverview = updatedUser.overview_enc ? this.encryptionService.decrypt(updatedUser.overview_enc) : '';

      //TODO SH: GDPR encryption v2 - remove encrypted fields and add decrypted values
      const { email_enc, recoveryEmail_enc, firstName_enc, lastName_enc, username_enc, userType_enc, institution_enc, overview_enc, hashedEmail, ...userResponse } = updatedUser as any;

      return {
        token: token,
        refreshToken: refreshToken,
        ...userResponse,
        email: decryptedEmail,
        recoveryEmail: decryptedRecoveryEmail,
        firstName: decryptedFirstName,
        lastName: decryptedLastName,
        userType: decryptedUserType,
        username: decryptedUsername,
        institution: decryptedInstitution,
        overview: decryptedOverview,
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
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'interestedTags',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'interestedCourses',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'studyPrograms',
          populate: { path: 'user', select: '_id firstName lastName userType' }
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
    //TODO SH: GDPR encryption - normalize email and compute HMAC for lookup
    const normalizedEmail = normalizeEmail(loginUserDto.email);
    const hashedEmail = this.encryptionService.hmacIndex(normalizedEmail);

    //TODO SH: GDPR encryption - lookup by HMAC index only (post-cutover)
    const existingUser = await this.userModel
      .findOne({ hashedEmail })
      .select('+password +isBlockedByAdmin +softDeleted +email_enc')
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

        //TODO SH: GDPR encryption - decrypt email for sending verification email (post-cutover)
        const decryptedEmail = this.encryptionService.decrypt(existingUser.email_enc);

        try {
          await this.mailerServive.sendVerificationEmail(
            decryptedEmail,
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

      //TODO SH: GDPR encryption - select encrypted fields and decrypt for response
      const updatedUser = await this.userModel
        .findById(existingUser._id)
        .select('+profilePicture +email_enc +recoveryEmail_enc +firstName_enc +lastName_enc +username_enc +userType_enc +institution_enc +overview_enc')
        .populate('interestedTags')
        .populate({
          path: 'profilePicture',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'interestedTags',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'interestedCourses',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'studyPrograms',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        // TODO Shayan: PACKAGE UPDATE FIX - Mongoose 8.19.1 Type Issue (same as above)
        // @ts-ignore - Suppress TS2590: Expression produces a union type that is too complex to represent
        .lean()
        .exec();

      //TODO SH: GDPR encryption - decrypt all PII fields for response compatibility
      const decryptedEmail = this.encryptionService.decrypt(updatedUser.email_enc);
      const decryptedRecoveryEmail = updatedUser.recoveryEmail_enc
        ? this.encryptionService.decrypt(updatedUser.recoveryEmail_enc)
        : undefined;
      const decryptedFirstName = this.encryptionService.decrypt(updatedUser.firstName_enc);
      const decryptedLastName = this.encryptionService.decrypt(updatedUser.lastName_enc);
      const decryptedUserType = this.encryptionService.decrypt(updatedUser.userType_enc);
      const decryptedUsername = updatedUser.username_enc ? this.encryptionService.decrypt(updatedUser.username_enc) : '';
      const decryptedInstitution = updatedUser.institution_enc ? this.encryptionService.decrypt(updatedUser.institution_enc) : '';
      const decryptedOverview = updatedUser.overview_enc ? this.encryptionService.decrypt(updatedUser.overview_enc) : '';

      //TODO SH: GDPR encryption - remove encrypted fields and add decrypted values
      const { email_enc, recoveryEmail_enc, firstName_enc, lastName_enc, username_enc, userType_enc, institution_enc, overview_enc, hashedEmail, ...userResponse } = updatedUser as any;

      return {
        token,
        refreshToken,
        ...userResponse,
        email: decryptedEmail,
        recoveryEmail: decryptedRecoveryEmail,
        firstName: decryptedFirstName,
        lastName: decryptedLastName,
        userType: decryptedUserType,
        username: decryptedUsername,
        institution: decryptedInstitution,
        overview: decryptedOverview,
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

    //TODO SH: GDPR encryption - select encrypted fields for decryption
    const users = await this.userModel.find(asAdmin ? {} : { status: true, softDeleted: false, isBlockedByAdmin: false, })
      .populate({
        path: 'profilePicture',
        populate: { path: 'user', select: '_id firstName lastName userType' }
      })
      .populate({
        path: 'interestedTags',
        populate: { path: 'user', select: '_id firstName lastName userType' }
      })
      .populate({
        path: 'interestedCourses',
        populate: { path: 'user', select: '_id firstName lastName userType' }
      })
      .populate({
        path: 'studyPrograms',
        populate: { path: 'user', select: '_id firstName lastName userType' }
      })
      .select(asAdmin ? '+isBlockedByAdmin +softDeleted +code +codeExpire +email_enc +recoveryEmail_enc +firstName_enc +lastName_enc +username_enc +userType_enc +institution_enc +overview_enc' : '-code -codeExpire +email_enc +recoveryEmail_enc +firstName_enc +lastName_enc +username_enc +userType_enc +institution_enc +overview_enc')
      .sort({ [sortField]: sortOrder })
      .lean()
      .exec();

    //TODO SH: GDPR encryption - decrypt all PII fields for all users in response
    return users.map(user => {
      const decryptedEmail = this.encryptionService.decrypt(user.email_enc);
      const decryptedRecoveryEmail = user.recoveryEmail_enc
        ? this.encryptionService.decrypt(user.recoveryEmail_enc)
        : undefined;
      const decryptedFirstName = this.encryptionService.decrypt(user.firstName_enc);
      const decryptedLastName = this.encryptionService.decrypt(user.lastName_enc);
      const decryptedUserType = this.encryptionService.decrypt(user.userType_enc);
      const decryptedUsername = user.username_enc ? this.encryptionService.decrypt(user.username_enc) : '';
      const decryptedInstitution = user.institution_enc ? this.encryptionService.decrypt(user.institution_enc) : '';
      const decryptedOverview = user.overview_enc ? this.encryptionService.decrypt(user.overview_enc) : '';

      const { email_enc, recoveryEmail_enc, firstName_enc, lastName_enc, username_enc, userType_enc, institution_enc, overview_enc, hashedEmail, ...userResponse } = user as any;

      return {
        ...userResponse,
        email: decryptedEmail,
        recoveryEmail: decryptedRecoveryEmail,
        firstName: decryptedFirstName,
        lastName: decryptedLastName,
        userType: decryptedUserType,
        username: decryptedUsername,
        institution: decryptedInstitution,
        overview: decryptedOverview,
      } as User;
    });
  }

  async findById(id: string): Promise<User> {
    try {
      //TODO SH: GDPR encryption - select encrypted fields for decryption
      const user = await this.userModel.findOne({ _id: new ObjectId(id), status: true, softDeleted: false, isBlockedByAdmin: false, })
        .select('+email_enc +recoveryEmail_enc +firstName_enc +lastName_enc +username_enc +userType_enc +institution_enc +overview_enc')
        .populate({
          path: 'profilePicture',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'interestedTags',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'interestedCourses',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'studyPrograms',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .lean()
        .exec();

      if (!user) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Incorrect Data',
            message: 'User not found!',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      //TODO SH: GDPR encryption - decrypt all PII fields for response compatibility
      const decryptedEmail = this.encryptionService.decrypt(user.email_enc);
      const decryptedRecoveryEmail = user.recoveryEmail_enc
        ? this.encryptionService.decrypt(user.recoveryEmail_enc)
        : undefined;
      const decryptedFirstName = this.encryptionService.decrypt(user.firstName_enc);
      const decryptedLastName = this.encryptionService.decrypt(user.lastName_enc);
      const decryptedUserType = this.encryptionService.decrypt(user.userType_enc);
      const decryptedUsername = user.username_enc ? this.encryptionService.decrypt(user.username_enc) : '';
      const decryptedInstitution = user.institution_enc ? this.encryptionService.decrypt(user.institution_enc) : '';
      const decryptedOverview = user.overview_enc ? this.encryptionService.decrypt(user.overview_enc) : '';

      //TODO SH: GDPR encryption - remove encrypted fields and add decrypted values
      const { email_enc, recoveryEmail_enc, firstName_enc, lastName_enc, username_enc, userType_enc, institution_enc, overview_enc, hashedEmail, ...userResponse } = user as any;

      return {
        ...userResponse,
        email: decryptedEmail,
        recoveryEmail: decryptedRecoveryEmail,
        firstName: decryptedFirstName,
        lastName: decryptedLastName,
        userType: decryptedUserType,
        username: decryptedUsername,
        institution: decryptedInstitution,
        overview: decryptedOverview,
      } as User;
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
      //TODO SH: GDPR encryption - select encrypted fields for admin view
      const user = await this.userModel.findOne({ _id: new ObjectId(id) })
        .populate({
          path: 'profilePicture',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'interestedTags',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'interestedCourses',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .populate({
          path: 'studyPrograms',
          populate: { path: 'user', select: '_id firstName lastName userType' }
        })
        .select('+isBlockedByAdmin +softDeleted +code +codeExpire +email_enc +recoveryEmail_enc +firstName_enc +lastName_enc +username_enc +userType_enc +institution_enc +overview_enc')
        .lean()
        .exec();

      if (!user) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Incorrect Data',
            message: 'User not found!',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      //TODO SH: GDPR encryption - decrypt all PII fields for admin response
      const decryptedEmail = this.encryptionService.decrypt(user.email_enc);
      const decryptedRecoveryEmail = user.recoveryEmail_enc
        ? this.encryptionService.decrypt(user.recoveryEmail_enc)
        : undefined;
      const decryptedFirstName = this.encryptionService.decrypt(user.firstName_enc);
      const decryptedLastName = this.encryptionService.decrypt(user.lastName_enc);
      const decryptedUserType = this.encryptionService.decrypt(user.userType_enc);
      const decryptedUsername = user.username_enc ? this.encryptionService.decrypt(user.username_enc) : '';
      const decryptedInstitution = user.institution_enc ? this.encryptionService.decrypt(user.institution_enc) : '';
      const decryptedOverview = user.overview_enc ? this.encryptionService.decrypt(user.overview_enc) : '';

      //TODO SH: GDPR encryption - remove encrypted fields and add decrypted values
      const { email_enc, recoveryEmail_enc, firstName_enc, lastName_enc, username_enc, userType_enc, institution_enc, overview_enc, hashedEmail, ...userResponse } = user as any;

      return {
        ...userResponse,
        email: decryptedEmail,
        recoveryEmail: decryptedRecoveryEmail,
        firstName: decryptedFirstName,
        lastName: decryptedLastName,
        userType: decryptedUserType,
        username: decryptedUsername,
        institution: decryptedInstitution,
        overview: decryptedOverview,
      } as User;
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
    
    //TODO SH: GDPR encryption - encrypt PII fields before update
    const updateData: any = {
      interestedCourses: updateUserDto.interestedCourses,
      interestedTags: updateUserDto.interestedTags,
      studyPrograms: updateUserDto.studyPrograms,
      profilePicture: updateUserDto.profilePicture,
    };

    // Encrypt PII fields if provided
    if (updateUserDto.firstName !== undefined) {
      updateData.firstName = updateUserDto.firstName;
      updateData.firstName_enc = this.encryptionService.encrypt(updateUserDto.firstName);
    }
    if (updateUserDto.lastName !== undefined) {
      updateData.lastName = updateUserDto.lastName;
      updateData.lastName_enc = this.encryptionService.encrypt(updateUserDto.lastName);
    }
    if (updateUserDto.username !== undefined) {
      updateData.username = updateUserDto.username;
      updateData.username_enc = updateUserDto.username ? this.encryptionService.encrypt(updateUserDto.username) : undefined;
    }
    if (updateUserDto.overview !== undefined) {
      updateData.overview = updateUserDto.overview;
      updateData.overview_enc = updateUserDto.overview ? this.encryptionService.encrypt(updateUserDto.overview) : undefined;
    }
    if (updateUserDto.recoveryEmail !== undefined) {
      updateData.recoveryEmail = updateUserDto.recoveryEmail;
      updateData.recoveryEmail_enc = updateUserDto.recoveryEmail ? this.encryptionService.encrypt(updateUserDto.recoveryEmail) : undefined;
    }

    await this.userModel.findOneAndUpdate(
      { _id: jwtUser.userId, softDeleted: false, isBlockedByAdmin: false },
      updateData
    );

    //TODO SH: GDPR encryption - select encrypted fields and decrypt for response
    const user = await this.userModel.findById(jwtUser.userId)
      .select('+profilePicture +email_enc +recoveryEmail_enc +firstName_enc +lastName_enc +username_enc +userType_enc +institution_enc +overview_enc')
      .populate({
        path: 'profilePicture',
        populate: { path: 'user', select: '_id firstName lastName userType' }
      })
      .populate({
        path: 'interestedTags',
        populate: { path: 'user', select: '_id firstName lastName userType' }
      })
      .populate({
        path: 'interestedCourses',
        populate: { path: 'user', select: '_id firstName lastName userType' }
      })
      .populate({
        path: 'studyPrograms',
        populate: { path: 'user', select: '_id firstName lastName userType' }
      })
      .lean()
      .exec();

    //TODO SH: GDPR encryption - decrypt all PII fields for response compatibility
    const decryptedEmail = this.encryptionService.decrypt(user.email_enc);
    const decryptedRecoveryEmail = user.recoveryEmail_enc
      ? this.encryptionService.decrypt(user.recoveryEmail_enc)
      : undefined;
    const decryptedFirstName = this.encryptionService.decrypt(user.firstName_enc);
    const decryptedLastName = this.encryptionService.decrypt(user.lastName_enc);
    const decryptedUserType = this.encryptionService.decrypt(user.userType_enc);
    const decryptedUsername = user.username_enc ? this.encryptionService.decrypt(user.username_enc) : '';
    const decryptedInstitution = user.institution_enc ? this.encryptionService.decrypt(user.institution_enc) : '';
    const decryptedOverview = user.overview_enc ? this.encryptionService.decrypt(user.overview_enc) : '';

    //TODO SH: GDPR encryption - remove encrypted fields and add decrypted values
    const { email_enc, recoveryEmail_enc, firstName_enc, lastName_enc, username_enc, userType_enc, institution_enc, overview_enc, hashedEmail, ...userResponse } = user as any;

    return {
      ...userResponse,
      email: decryptedEmail,
      recoveryEmail: decryptedRecoveryEmail,
      firstName: decryptedFirstName,
      lastName: decryptedLastName,
      userType: decryptedUserType,
      username: decryptedUsername,
      institution: decryptedInstitution,
      overview: decryptedOverview,
    } as User;
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
    })
      .select('+email_enc +recoveryEmail_enc')
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

    //TODO SH: GDPR encryption - decrypt emails for notification (post-cutover)
    const decryptedEmail = this.encryptionService.decrypt(existingUser.email_enc);
    const decryptedRecoveryEmail = existingUser.recoveryEmail_enc
      ? this.encryptionService.decrypt(existingUser.recoveryEmail_enc)
      : decryptedEmail;

    try {
      await this.mailerServive.sendSoftDeleteConfirmationEmail(
        useRecoveryEmail ? decryptedRecoveryEmail : decryptedEmail,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'otp_sent_success',
      user: {
        email: useRecoveryEmail ? decryptedRecoveryEmail : decryptedEmail,
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
    })
      .select('+email_enc +recoveryEmail_enc')
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

    // verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Expire code after 5 minutes
    const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

    existingUser.code = this.authService.hashPassword(code);
    existingUser.codeExpire = codeExpire;
    await existingUser.save();

    //TODO SH: GDPR encryption - decrypt emails for notification (post-cutover, softAnonymizedDeleteUserRequest)
    const decryptedEmail = this.encryptionService.decrypt(existingUser.email_enc);
    const decryptedRecoveryEmail = existingUser.recoveryEmail_enc
      ? this.encryptionService.decrypt(existingUser.recoveryEmail_enc)
      : decryptedEmail;

    try {
      await this.mailerServive.sendSoftDeleteConfirmationEmail(
        useRecoveryEmail ? decryptedRecoveryEmail : decryptedEmail,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'otp_sent_success',
      user: {
        email: useRecoveryEmail ? decryptedRecoveryEmail : decryptedEmail,
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
    })
      .select('+email_enc +recoveryEmail_enc')
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

    // verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Expire code after 5 minutes
    const codeExpire = new Date(Date.now() + 5 * 60 * 1000);

    existingUser.code = this.authService.hashPassword(code);
    existingUser.codeExpire = codeExpire;
    await existingUser.save();

    //TODO SH: GDPR encryption - decrypt emails for notification (post-cutover, softKeepDataDeleteUserRequest)
    const decryptedEmail = this.encryptionService.decrypt(existingUser.email_enc);
    const decryptedRecoveryEmail = existingUser.recoveryEmail_enc
      ? this.encryptionService.decrypt(existingUser.recoveryEmail_enc)
      : decryptedEmail;

    try {
      await this.mailerServive.sendSoftDeleteConfirmationEmail(
        useRecoveryEmail ? decryptedRecoveryEmail : decryptedEmail,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'otp_sent_success',
      user: {
        email: useRecoveryEmail ? decryptedRecoveryEmail : decryptedEmail,
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
      .select('+code +codeExpire +email_enc +recoveryEmail_enc')
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

    //TODO SH: GDPR encryption - erasure procedure (post-cutover)
    // Nullify encrypted email fields to comply with "right to be forgotten"
    var userDbData = {
      firstName: 'unknown',
      lastName: 'unknown',
      username: 'unknown',
      hashedEmail: null, //TODO SH: GDPR encryption - nullify HMAC index (sparse index allows null)
      email_enc: null,   //TODO SH: GDPR encryption - nullify encrypted email
      recoveryEmail_enc: null, //TODO SH: GDPR encryption - nullify encrypted recovery email
      softDeleted: true,
      isBlockedByAdmin: false,
      status: false,
    };

    if (keepData) {
      //TODO SH: GDPR encryption - keep name/username but still nullify email per GDPR
      userDbData = {
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        username: existingUser.username,
        hashedEmail: null, //TODO SH: GDPR encryption - nullify HMAC index
        email_enc: null,   //TODO SH: GDPR encryption - nullify encrypted email
        recoveryEmail_enc: null, //TODO SH: GDPR encryption - nullify encrypted recovery email
        softDeleted: true,
        isBlockedByAdmin: false,
        status: false,
      };
    }

    const result = await this.userModel.findByIdAndUpdate(existingUser._id, userDbData).exec();

    //TODO SH: GDPR encryption - decrypt email for sending deletion confirmation
    const emailForNotification = existingUser.email_enc 
      ? this.encryptionService.decrypt(existingUser.email_enc)
      : 'unknown@example.com';
    const recoveryEmailForNotification = existingUser.recoveryEmail_enc
      ? this.encryptionService.decrypt(existingUser.recoveryEmail_enc)
      : emailForNotification;

    try {
      await this.mailerServive.sendSoftDeletedSuccessEmail(
        useRecoveryEmail ? recoveryEmailForNotification : emailForNotification,
        `${existingUser.firstName} ${existingUser.lastName}`,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'user_deleted_success',
      user: {
        email: useRecoveryEmail ? recoveryEmailForNotification : emailForNotification, //TODO SH: GDPR encryption - use decrypted email from above
      }
    };
  }

  async sendResetPasswordRequest(resetPasswordRequestDto: ResetPasswordRequestDto, useRecoveryEmail: boolean = false) {

    //TODO SH: GDPR encryption - normalize email and compute HMAC for lookup (post-cutover)
    const normalizedEmail = normalizeEmail(resetPasswordRequestDto.email);
    const hashedEmail = this.encryptionService.hmacIndex(normalizedEmail);

    const existingUser = await this.userModel.findOne({
        hashedEmail,
        softDeleted: false,
        isBlockedByAdmin: false,
      })
      .select('+email_enc +recoveryEmail_enc')
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

    //TODO SH: GDPR encryption - decrypt emails for notification (post-cutover)
    const decryptedEmail = this.encryptionService.decrypt(existingUser.email_enc);
    const decryptedRecoveryEmail = existingUser.recoveryEmail_enc
      ? this.encryptionService.decrypt(existingUser.recoveryEmail_enc)
      : decryptedEmail;

    try {
      await this.mailerServive.sendResetPasswordCodeEmail(
        useRecoveryEmail ? decryptedRecoveryEmail : decryptedEmail,
        `${existingUser.firstName} ${existingUser.lastName}`,
        code,
      );
    } catch (er) {
      console.log(er);
    }

    return {
      message: 'OTP for reseting password sent successfully',
      user: {
        email: useRecoveryEmail ? decryptedRecoveryEmail : decryptedEmail,
      }
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    //TODO SH: GDPR encryption - normalize email and compute HMAC for lookup
    const normalizedEmail = normalizeEmail(resetPasswordDto.email);
    const hashedEmail = this.encryptionService.hmacIndex(normalizedEmail);

    //TODO SH: GDPR encryption - lookup by HMAC index only (post-cutover)
    const existingUser = await this.userModel.findOneAndUpdate({
      hashedEmail,
      softDeleted: false,
      isBlockedByAdmin: false
    }, {
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
    //TODO SH: GDPR encryption - normalize email and compute HMAC for lookup
    const normalizedEmail = normalizeEmail(createUserDto.email);
    const hashedEmail = this.encryptionService.hmacIndex(normalizedEmail);

    //TODO SH: GDPR encryption - lookup by HMAC index only (post-cutover)
    const existingUser = await this.userModel.findOne({ hashedEmail }).exec();

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

    //TODO SH: GDPR encryption - encrypt email (post-cutover: encrypted only)
    const email_enc = this.encryptionService.encrypt(normalizedEmail);

    // TODO is SH: Include overview when admin creates users
    const updatedCreatedUserDTO = {
      ...createUserDto,
      hashedEmail, //TODO SH: GDPR encryption - HMAC index
      email_enc, //TODO SH: GDPR encryption - encrypted email
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
          email: normalizedEmail, //TODO SH: GDPR encryption - use input email (post-cutover)
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


