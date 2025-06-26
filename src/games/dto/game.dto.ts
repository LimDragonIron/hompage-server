import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 게임 뉴스 생성 DTO
 */
export class CreateGamesDto {
  @ApiPropertyOptional({
    example: '신작 출시 안내',
    description: '게임 뉴스 제목',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: '금일 신작이 출시되었습니다.',
    description: '게임 뉴스 내용',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    example: ['액션', 'RPG'],
    description: '해시태그 배열',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ example: 123, description: '메인 파일(썸네일) ID' })
  @IsOptional()
  @IsInt()
  fileId?: number;
}

export class PlatformLinkDto {
  @ApiProperty({ example: 'Steam', description: '플랫폼명' })
  @IsString()
  platform: string;

  @ApiProperty({
    example: 'https://store.steampowered.com/app/...',
    description: '플랫폼 링크',
  })
  @IsString()
  link: string;
}

/**
 * 게임 뉴스 수정 DTO
 */
export class UpdateGamesDto {
  @ApiPropertyOptional({
    example: '수정된 제목',
    description: '게임 뉴스 제목',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: '수정된 내용',
    description: '게임 뉴스 내용',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 321, description: '메인 파일 ID' })
  @IsOptional()
  @IsInt()
  fileId?: number;

  @ApiPropertyOptional({
    type: [PlatformLinkDto],
    description: '플랫폼 링크 배열',
    example: [{ platform: 'Steam', link: 'https://store...' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformLinkDto)
  platformLinks?: PlatformLinkDto[];
}
