import { IsString, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 히어로 생성 DTO
 */
export class CreateHeroDto {
  @ApiPropertyOptional({
    example: '백엔드 개발자 히어로',
    description: '히어로 제목',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'NestJS로 서버를 구한다!',
    description: '히어로 소개/내용',
  })
  @IsOptional()
  @IsString()
  content?: string;
}

/**
 * 히어로 수정 DTO (모든 필드 optional)
 */
export class UpdateHeroDto extends PartialType(CreateHeroDto) {}
