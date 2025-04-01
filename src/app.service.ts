import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RequestIosAccess, RequestIosAccessDocument } from './shared/schemas/request_ios_access.schema';
import { CreateReqIosAccessDto } from './shared/dtos/create-ios-access-dto';

@Injectable()
export class AppService {

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
    const requestIosAccess = new this.requestIosAccessModel(createReqIosAccessDto);
    return requestIosAccess.save();
  }

  async getTestAccounts() {
    return this.requestIosAccessModel.find();
  }
}
