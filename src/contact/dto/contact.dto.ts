import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 문의 생성 DTO
 */
export class CreateContactDto {
  @ApiProperty({ example: '게임 오류 신고', description: '문의 제목' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '게임이 자꾸 튕깁니다.', description: '문의 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'user@email.com', description: '이메일' })
  @IsEmail()
  email: string;
}
