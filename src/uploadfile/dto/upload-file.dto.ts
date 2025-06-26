import { IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 파일 업로드 요청 DTO
 */
export class UploadFileDto {
  @ApiProperty({
    example: 'NEWS',
    description: '타겟 엔티티 타입 (ContentEntityType 중 하나)',
  })
  @IsString()
  contentType: string;

  @ApiProperty({ example: 1, description: '타겟 엔티티의 ID' })
  @Type(() => Number)
  @IsNumber({}, { message: 'contentId must be a number' })
  contentId: number;
}
