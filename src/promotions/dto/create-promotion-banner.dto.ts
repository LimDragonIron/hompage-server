import { IsOptional, IsString, IsArray, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 프로모션 배너 생성 DTO
 */
export class CreatePromotionBannerDto {
  @ApiPropertyOptional({
    example: '여름 할인 이벤트',
    description: '배너 제목',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: '최대 50% 할인!', description: '배너 내용' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    example: [101, 102],
    description: '업로드된 파일 ID 배열',
  })
  @IsArray()
  @IsOptional()
  fileId?: number[]; // 파일 ID 배열
}
