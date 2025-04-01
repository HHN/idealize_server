import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RequestIosAccess, RequestIosAccessDocument } from './shared/schemas/request_ios_access.schema';
import { CreateReqIosAccessDto } from './shared/dtos/create-ios-access-dto';

import axios from 'axios';


@Injectable()
export class AppService {

  private readonly RECAPTCHA_SECRET_KEY = '6LepSAYrAAAAADP4oDs_HxwI6SvK0euGY8MXCB5O';
  private readonly VERIFICATION_URL = 'https://www.google.com/recaptcha/api/siteverify';

  constructor(
    @InjectModel(RequestIosAccess.name) private requestIosAccessModel: Model<RequestIosAccessDocument>,
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  async requestTestAccount(createReqIosAccessDto: CreateReqIosAccessDto) {
    if (await this.requestIosAccessModel.findOne({ email: createReqIosAccessDto.email })) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Already Requested',
          message: 'You cannot report more than one',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!await this.verifyRecaptcha(createReqIosAccessDto.recaptchaToken)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Invalid reCAPTCHA',
          message: 'Invalid reCAPTCHA',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const requestIosAccess = new this.requestIosAccessModel(createReqIosAccessDto);
    return requestIosAccess.save();
  }

  async getTestAccounts() {
    return this.requestIosAccessModel.find();
  }


  private async verifyRecaptcha(token: string, remoteIp?: string): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      params.append('secret', this.RECAPTCHA_SECRET_KEY);
      params.append('response', token);

      if (remoteIp) {
        params.append('remoteip', remoteIp);
      }

      const response = await axios.post(this.VERIFICATION_URL, params);

      return response.data.success;
    } catch (error) {
      console.error('reCAPTCHA verification failed:', error);
      return false;
    }
  }
}
