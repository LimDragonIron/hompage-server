import {
  Body,
  Controller,
  FileTypeValidator,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { UploadfileService } from './uploadfile.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiFile } from '@app/decorators';
import { FileMimeExtValidator, MulterFilenamePipe } from '@app/pipe';
import { UploadFileDto } from './dto/upload-file.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';

/**
 * 파일 업로드 API
 */
@ApiTags('UploadFile')
@Controller('uploadfile')
export class UploadfileController {
  constructor(private readonly uploadfileService: UploadfileService) {}

  /**
   * 파일 업로드
   * @summary 미디어 파일 업로드 (로그인 필요, 파일+폼)
   * @param file 업로드 파일 (multipart/form-data)
   * @param context 업로드 파일 메타정보 (contentType, contentId)
   * @returns 업로드된 파일 정보
   */
  @ApiOperation({
    summary: '미디어 파일 업로드',
    description: '파일(이미지 등)을 업로드하고 파일 정보를 반환합니다.',
  })
  @ApiBearerAuth()
  @ApiFile('file')
  @ApiBody({ type: UploadFileDto })
  @ApiResponse({
    status: 201,
    description: '업로드 성공',
    schema: {
      example: {
        code: 'SUCCESS',
        data: {
          id: 1,
          name: 'cat.jpg',
          type: 'image',
          url: 'http://localhost:8000/uploads/xxx.jpg',
          size: 12345,
        },
        message: '',
        timestamp: '2025-06-26T06:00:00.000Z',
        meta: '',
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Post('media')
  async uploadMedia(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [new FileMimeExtValidator({})],
      }),
      new MulterFilenamePipe(),
    )
    file: Express.Multer.File,
    @Req() req,
    @Body() context: UploadFileDto,
  ) {
    const result = await this.uploadfileService.fileUpload(file, context);
    return result;
  }
}
