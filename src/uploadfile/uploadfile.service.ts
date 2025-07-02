import { DatabaseService } from '@app/database';
import { ResponseBuilder } from '@app/response';
import { StorageAdapter } from '@app/storage';
import { fileNameStrategy, getExtension, getFileType } from '@app/utils/file';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UploadFileDto } from './dto/upload-file.dto';
import { ContentEntityType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

/**
 * 파일 업로드 서비스
 */
@Injectable()
export class UploadfileService {
  private readonly logger = new Logger(UploadfileService.name);

  constructor(
    private readonly storageService: StorageAdapter,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 실제 파일 업로드 처리 및 파일 정보 DB 저장
   */
  async fileUpload(uploadFile: Express.Multer.File, uploadDto: UploadFileDto) {
    let uploadFilePath: string | null = null;
    try {
      uploadFilePath = await this.storageService.upload(
        {
          buffer: uploadFile.buffer,
          originalName: uploadFile.originalname,
        },
        fileNameStrategy,
      );

      const extension = getExtension(uploadFile.originalname);
      const fileType = getFileType(extension);

      if (!uploadDto.contentType || !uploadDto.contentId) {
        throw new BadRequestException('contentType과 contentId는 필수입니다.');
      }

      const typeEnum =
        ContentEntityType[
          uploadDto.contentType as keyof typeof ContentEntityType
        ];

      if (!typeEnum) {
        throw new BadRequestException('유효하지 않은 contentType 값입니다.');
      }

      // 타겟 엔티티 존재 확인
      let targetExists = false;
      if (typeEnum === ContentEntityType.PROMOTION_BANNER) {
        const banner = await this.databaseService.promotionBanner.findUnique({
          where: { id: uploadDto.contentId },
        });
        if (banner) targetExists = true;
      } else if (
        typeEnum === ContentEntityType.NEWS ||
        typeEnum === ContentEntityType.GAMES_NEWS
      ) {
        const content = await this.databaseService.content.findUnique({
          where: { id: uploadDto.contentId },
        });
        if (content) targetExists = true;
      } else if (typeEnum === ContentEntityType.HERO) {
        const hero = await this.databaseService.hero.findUnique({
          where: { id: uploadDto.contentId },
        });
        if (hero) targetExists = true;
      }
      if (!targetExists) {
        throw new BadRequestException('존재하지 않는 대상 id입니다.');
      }

      // 기존 파일 여부 확인
      const existingFile = await this.databaseService.file.findFirst({
        where: {
          targetId: uploadDto.contentId,
          targetType: typeEnum,
        },
      });

      // prod 환경이 아니면 localhost URL 사용, prod면 storage 리턴 URL 사용
      const nodeEnv = (this.configService.get('NODE_ENV') || '').toLowerCase();
      let urlForDb = uploadFilePath;
      if (nodeEnv !== 'prod' && uploadFilePath) {
        let relativeUrl: string;
        if (uploadFilePath.startsWith('/uploads/')) {
          relativeUrl = uploadFilePath;
        } else if (uploadFilePath.startsWith('uploads/')) {
          relativeUrl = '/' + uploadFilePath;
        } else {
          relativeUrl = '/uploads/' + uploadFilePath.replace(/^\/+/, '');
        }
        const port = this.configService.get('APP_PORT') || 8000;
        urlForDb = `http://localhost:${port}${relativeUrl}`;
      }

      let fileSave: any;
      if (existingFile) {
        // 기존 파일이 있으면 해당 파일을 업데이트
        if (existingFile.url && existingFile.url !== urlForDb) {
          await this.storageService.removeFile(existingFile.url);
        }
        fileSave = await this.databaseService.file.update({
          where: { id: existingFile.id },
          data: {
            name: uploadFile.originalname,
            url: urlForDb,
            size: uploadFile.size,
            type: fileType,
          },
        });
      } else {
        // 없으면 새로 생성
        fileSave = await this.databaseService.file.create({
          data: {
            name: uploadFile.originalname,
            url: urlForDb,
            size: uploadFile.size,
            type: fileType,
            targetId: uploadDto.contentId,
            targetType: typeEnum,
          },
        });
      }
      const { id, type, url, size, name } = fileSave;
      return ResponseBuilder.OK_WITH({ id, name, type, url, size });
    } catch (error) {
      if (uploadFilePath) {
        await this.storageService.removeFile(uploadFilePath);
      }
      throw new InternalServerErrorException(
        ResponseBuilder.Error(
          error?.message || 'File saving failed',
          'INTERNAL SERVER ERROR',
        ),
      );
    }
  }
}