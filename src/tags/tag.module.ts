
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { TagController } from './tag/controllers/tag.controller';
import { TagSchema } from './tag/schemas/tag.schema';
import { TagService } from './tag/services/tag.service';
import { AdminTagController } from './tag/controllers/admin-tag.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Tag', schema: TagSchema }]),
        AuthModule
    ],
    controllers: [
        TagController,
        AdminTagController
    ],
    providers: [TagService]
})
export class TagModule { }