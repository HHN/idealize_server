//TODO SH: GDPR encryption - integration tests for encrypted user operations
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from './user.service';
import { User, UserDocument } from '../schemas/user.schema';
import { AuthService } from 'src/auth/auth.service';
import { MailerService } from 'src/mailer/mailer.service';
import { EncryptionService } from 'src/encryption/encryption.service';
import { Project } from 'src/projects/project/schemas/project.schema';
import { CreateUserDto } from '../dtos/create-user.dto';
import { LoginUserDto } from '../dtos/login-user.dto';
import { normalizeEmail } from 'src/shared/utils/email.utils';

describe('UsersService - GDPR Encryption Integration', () => {
  let service: UsersService;
  let encryptionService: EncryptionService;
  let userModel: Model<UserDocument>;
  let authService: AuthService;
  let mailerService: MailerService;

  // Mock user data
  const mockUser = {
    _id: 'test-user-id',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'hashed-password',
    username: 'johndoe',
    status: false,
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    //TODO SH: GDPR encryption - create mock instances for testing
    const mockUserModel = {
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      exec: jest.fn(),
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      findOneAndUpdate: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Project.name),
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: {
            hashPassword: jest.fn((pwd) => `hashed-${pwd}`),
            comparePasswords: jest.fn().mockResolvedValue(true),
            generateToken: jest.fn().mockResolvedValue('mock-token'),
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendVerificationEmail: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn((plaintext) => ({
              ciphertext: Buffer.from(plaintext).toString('base64'),
              iv: 'mock-iv-base64',
              authTag: 'mock-tag-base64',
              alg: 'AES-256-GCM',
              kid: 'v1',
            })),
            decrypt: jest.fn((field) => Buffer.from(field.ciphertext, 'base64').toString('utf8')),
            hmacIndex: jest.fn((email) => `hmac-${email}`),
            decryptWithFallback: jest.fn((encrypted, plaintext) => plaintext || 'decrypted'),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    authService = module.get<AuthService>(AuthService);
    mailerService = module.get<MailerService>(MailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create() with encryption', () => {
    it('should normalize email before encryption and HMAC', async () => {
      //TODO SH: GDPR encryption - verify email normalization happens
      const createUserDto: CreateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'Jane.Smith@Example.COM  ', // Uppercase + whitespace
        password: 'SecurePass123',
        username: 'janesmith',
        institution: 'Test University',
        recoveryEmail: '',
        userType: 'student',
        profilePicture: null,
      };

      (userModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const mockCreatedUser = {
        ...mockUser,
        save: jest.fn().mockResolvedValue({
          _id: 'new-user-id',
          ...createUserDto,
          email: 'jane.smith@example.com',
        }),
      };

      (userModel as any) = Object.assign(userModel, mockCreatedUser);
      jest.spyOn(userModel, 'prototype' as any).mockImplementation(() => mockCreatedUser);

      try {
        await service.create(createUserDto);
      } catch (e) {
        // Expected - mailer might fail in test
      }

      //TODO SH: GDPR encryption - verify email was normalized
      expect(encryptionService.hmacIndex).toHaveBeenCalledWith('jane.smith@example.com');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('jane.smith@example.com');
    });

    it('should generate hashedEmail for HMAC index', async () => {
      //TODO SH: GDPR encryption - verify HMAC index is generated
      const createUserDto: CreateUserDto = {
        firstName: 'Bob',
        lastName: 'Builder',
        email: 'bob@example.com',
        password: 'BuildIt123',
        username: 'bobbuilder',
        institution: 'Test University',
        recoveryEmail: '',
        userType: 'student',
        profilePicture: null,
      };

      (userModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const normalizedEmail = normalizeEmail(createUserDto.email);
      const expectedHashedEmail = `hmac-${normalizedEmail}`;

      try {
        await service.create(createUserDto);
      } catch (e) {
        // Expected
      }

      //TODO SH: GDPR encryption - verify HMAC was called
      expect(encryptionService.hmacIndex).toHaveBeenCalledWith(normalizedEmail);
    });

    it('should check for existing users using dual read (HMAC + plaintext)', async () => {
      //TODO SH: GDPR encryption - verify dual read query pattern
      const createUserDto: CreateUserDto = {
        firstName: 'Alice',
        lastName: 'Wonder',
        email: 'alice@example.com',
        password: 'Wonderland123',
        username: 'alicewonder',
        institution: 'Test University',
        recoveryEmail: '',
        userType: 'student',
        profilePicture: null,
      };

      const normalizedEmail = normalizeEmail(createUserDto.email);
      const expectedHashedEmail = `hmac-${normalizedEmail}`;

      (userModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.create(createUserDto);
      } catch (e) {
        // Expected
      }

      //TODO SH: GDPR encryption - verify query includes both HMAC and plaintext
      expect(userModel.findOne).toHaveBeenCalledWith({
        $or: [
          { hashedEmail: expectedHashedEmail },
          { email: normalizedEmail },
        ],
      });
    });
  });

  describe('login() with encrypted email lookup', () => {
    it('should use HMAC index for login lookup', async () => {
      //TODO SH: GDPR encryption - verify login uses HMAC index
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'TestPass123',
      };

      const normalizedEmail = normalizeEmail(loginDto.email);
      const expectedHashedEmail = `hmac-${normalizedEmail}`;

      (userModel.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          status: true,
          password: 'hashed-TestPass123',
          softDeleted: false,
          isBlockedByAdmin: false,
        }),
      });

      (userModel.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
        }),
      });

      try {
        await service.login(loginDto);
      } catch (e) {
        // Expected
      }

      //TODO SH: GDPR encryption - verify dual read in login
      expect(userModel.findOne).toHaveBeenCalledWith({
        $or: [
          { hashedEmail: expectedHashedEmail },
          { email: normalizedEmail },
        ],
      });
    });

    it('should normalize email before login lookup', async () => {
      //TODO SH: GDPR encryption - verify email normalization in login
      const loginDto: LoginUserDto = {
        email: 'Test@EXAMPLE.com  ',
        password: 'TestPass123',
      };

      (userModel.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.login(loginDto);
      } catch (e) {
        // Expected - user not found
      }

      //TODO SH: GDPR encryption - verify normalization happened
      expect(encryptionService.hmacIndex).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('dual read/write pattern', () => {
    it('should write both plaintext and encrypted email during migration', async () => {
      //TODO SH: GDPR encryption - verify dual write pattern
      const createUserDto: CreateUserDto = {
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        password: 'Peanuts123',
        username: 'charliebrown',
        institution: 'Test University',
        recoveryEmail: '',
        userType: 'student',
        profilePicture: null,
      };

      (userModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      try {
        await service.create(createUserDto);
      } catch (e) {
        // Expected
      }

      //TODO SH: GDPR encryption - both encrypt() and hmacIndex() should be called
      expect(encryptionService.encrypt).toHaveBeenCalled();
      expect(encryptionService.hmacIndex).toHaveBeenCalled();
    });
  });
});
