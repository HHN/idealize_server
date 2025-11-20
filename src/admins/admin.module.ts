import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { AdminService } from './admin/services/admin.service';
import { AdminController } from './admin/controllers/admin.controller';
import { AdminSchema } from './admin/schemas/admin.schema';
//TODO SH: GDPR encryption - import EncryptionModule for PII encryption
import { EncryptionModule } from 'src/encryption/encryption.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Admin', schema: AdminSchema }]),
        AuthModule,
        EncryptionModule, //TODO SH: GDPR encryption - provides EncryptionService
    ],
    controllers: [AdminController],
    providers: [
        AdminService,
    ]
})
export class AdminModule { }
