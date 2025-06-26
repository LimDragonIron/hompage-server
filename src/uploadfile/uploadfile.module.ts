import { Module, Provider } from '@nestjs/common';
import { UploadfileService } from './uploadfile.service';
import { UploadfileController } from './uploadfile.controller';
import { StorageAdapter } from '@app/storage';
import { ConfigService } from '@nestjs/config';
import { LocalStorage } from '@app/storage/local-storage';

const StorageProvider: Provider = {
  provide: StorageAdapter,
  useFactory: (config: ConfigService) => {
    switch (process.env.NODE_ENV) {
      case 'local':
        return new LocalStorage(config);
      case 'dev':
      case 'prod':
        return new LocalStorage(config);
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
