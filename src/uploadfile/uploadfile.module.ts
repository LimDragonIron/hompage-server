import { Module, Provider } from '@nestjs/common';
import { UploadfileService } from './uploadfile.service';
import { UploadfileController } from './uploadfile.controller';
import { StorageAdapter } from '@app/storage';
import { ConfigService } from '@nestjs/config';
import { LocalStorage } from '@app/storage/local-storage';
import { S3Storage } from '@app/storage/s3-storage';

const StorageProvider: Provider = {
  provide: StorageAdapter,
  useFactory: (config: ConfigService) => {
    switch (process.env.NODE_ENV) {
      case 'local':
        return new LocalStorage(config);
      case 'dev':
        return new S3Storage(config);
      case 'prod':
        return new S3Storage(config);
      default:
        throw new Error('Invalid Environment');
    }
  },
  inject: [ConfigService],
};

@Module({
  controllers: [UploadfileController],
  providers: [StorageProvider, UploadfileService],
})
export class UploadfileModule {}
