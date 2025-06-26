import { IsOptional, IsString, IsArray, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 프로모션 배너 수정 DTO
 */
export class UpdatePromotionBannerDto {
  @ApiPropertyOptional({ example: '겨울 대세 세일', description: '배너 제목' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: '20% 추가 할인!', description: '배너 내용' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: 'clrk_123...', description: '작성자 ID' })
  @IsString()
  @IsOptional()
  authorId?: string;

  @ApiPropertyOptional({ example: 105, description: '대표 파일 ID' })
  @IsNumber()
  @IsOptional()
  fileId?: number;
}
