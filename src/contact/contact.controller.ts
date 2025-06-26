import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

/**
 * 문의(Contact) 관련 API 컨트롤러
 */
@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * 문의 생성 (누구나)
   * @param createContactDto 문의 생성 DTO
   * @returns 생성된 문의 데이터
   */
  @ApiOperation({ summary: '문의 생성' })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({ status: 201, description: '문의 등록 성공' })
  @Post()
  async create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  /**
   * 문의 전체 리스트 조회 (관리자)
   * @returns 문의 리스트
   */
  @ApiOperation({ summary: '문의 리스트 조회 (관리자)' })
  @ApiResponse({ status: 200, description: '문의 리스트 반환' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.contactService.findAll();
  }

  /**
   * 문의 상세 조회 (관리자)
   * @param id 문의 고유 ID
   * @returns 문의 상세 데이터
   */
  @ApiOperation({ summary: '문의 상세 조회 (관리자)' })
  @ApiResponse({ status: 200, description: '문의 상세 반환' })
  @ApiParam({ name: 'id', type: Number, description: '문의 ID' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contactService.findOne(Number(id));
  }
}
