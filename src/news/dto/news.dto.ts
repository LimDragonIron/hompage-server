import { IsOptional, IsString, IsArray, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 뉴스 생성 DTO
 */
export class CreateNewsDto {
  @ApiPropertyOptional({
    example: '새로운 이벤트 소식',
    description: '뉴스 제목',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: '이벤트 내용이 여기에 들어갑니다.',
    description: '뉴스 본문',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    example: ['이벤트', '공지'],
    description: '해시태그 배열',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ example: 101, description: '대표 파일(썸네일 등) ID' })
  @IsOptional()
  @IsInt()
  fileId?: number;
}

/**
 * 뉴스 수정 DTO
 */
export class UpdateNewsDto {
  @ApiPropertyOptional({ example: '수정된 제목', description: '뉴스 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '수정된 본문', description: '뉴스 본문' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: ['업데이트'], description: '해시태그 배열' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ example: 103, description: '대표 파일(썸네일 등) ID' })
  @IsOptional()
  @IsInt()
  fileId?: number;
}
