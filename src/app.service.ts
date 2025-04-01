import { Injectable } from '@nestjs/common';
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
    const requestIosAccess = new this.requestIosAccessModel(createReqIosAccessDto);
    return requestIosAccess.save();
  }

  async getTestAccounts() {
    return this.requestIosAccessModel.find();
  }
}
