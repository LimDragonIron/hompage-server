import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import { Company } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

/**
 * 회사 정보 관련 API
 */
@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /**
   * 회사 정보 최초 1회 생성 (관리자 전용)
   */
  @ApiOperation({ summary: '회사 정보 생성 (최초 1회, 관리자만)' })
  @ApiBody({
    schema: {
      example: {
        name: 'DragonIron Games Corp.',
        postalCode: '12345',
        address: '서울특별시 강남구 테헤란로 123',
        addressDetail: '101호',
        phone: '02-1234-5678',
        email: 'contact@dragoniron.com',
      },
    },
    description: '회사 정보(필수: name, 나머지 선택)',
  })
  @ApiResponse({ status: 201, description: '회사 생성 성공' })
  @ApiResponse({ status: 400, description: '요청값 오류' })
  @ApiResponse({ status: 409, description: '이미 회사 존재' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() data: Partial<Company>) {
    return this.companyService.create(data);
  }

  /**
   * 단일 회사 정보 조회 (공개)
   */
  @ApiOperation({ summary: '회사 정보 조회 (공개)' })
  @ApiResponse({ status: 200, description: '회사 정보 반환' })
  @Get()
  getCompany() {
    return this.companyService.getCompany();
  }

  /**
   * 회사 정보 수정 (관리자)
   */
  @ApiOperation({ summary: '회사 정보 수정 (관리자)' })
  @ApiBody({
    schema: {
      example: {
        name: '드래곤아이언게임즈(수정)',
        address: '서울 강남구 역삼로 456',
        phone: '02-2222-3333',
        // 필요한 필드만 포함해서 전달 가능
      },
    },
    description: '수정할 회사 정보(필수: 없음, 변경할 항목만 전달)',
  })
  @ApiResponse({ status: 200, description: '회사 정보 수정 성공' })
  @ApiBearerAuth()
  @Patch()
  @UseGuards(JwtAuthGuard)
  update(@Body() data: Partial<Company>) {
    return this.companyService.update(data);
  }
}
