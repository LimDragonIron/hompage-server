import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { HeroService } from './hero.service';
import { CreateHeroDto, UpdateHeroDto } from './dto/hero.dto';
import { Public } from '@app/decorators';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

/**
 * 히어로(Hero) 관련 컨트롤러
 */
@ApiTags('Hero')
@Controller('heroes')
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  /**
   * 내 히어로 목록 (상태별, 페이지네이션)
   */
  @ApiOperation({ summary: '내 히어로 목록(상태별, 페이지네이션)' })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'active', 'inactive'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: '히어로 목록 반환' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async getHeroes(
    @Req() req,
    @Query('status') status?: 'draft' | 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.heroService.getHeroes(
      req.user.userId,
      status,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * 전체 활성화 히어로 목록 (공개)
   */
  @ApiOperation({ summary: '전체 활성화 히어로 목록 (공개)' })
  @ApiResponse({ status: 200, description: '활성화된 히어로 목록 반환' })
  @Get('active')
  @Public()
  async getActiveHeroes() {
    return this.heroService.getActiveHeroes();
  }

  /**
   * 내 드래프트 히어로 1개 생성/조회
   */
  @ApiOperation({ summary: '내 드래프트 히어로 1개 생성/조회' })
  @ApiBearerAuth()
  @ApiBody({ type: CreateHeroDto })
  @ApiResponse({ status: 201, description: '드래프트 히어로 생성 or 반환' })
  @UseGuards(JwtAuthGuard)
  @Post('draft-or-create')
  async findOrCreateDraftHero(@Req() req, @Body() dto: CreateHeroDto) {
    return this.heroService.findOrCreateDraftByUser(req.user.userId, dto);
  }

  /**
   * 드래프트 히어로 수정
   */
  @ApiOperation({ summary: '드래프트 히어로 수정' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateHeroDto })
  @ApiResponse({ status: 200, description: '수정된 드래프트 반환' })
  @UseGuards(JwtAuthGuard)
  @Patch('draft/:id')
  async updateDraftHero(
    @Param('id') id: string,
    @Body() dto: UpdateHeroDto,
    @Req() req,
  ) {
    return this.heroService.updateDraftHero(Number(id), dto, req.user.userId);
  }

  /**
   * 드래프트 히어로 삭제
   */
  @ApiOperation({ summary: '드래프트 히어로 삭제' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard)
  @Delete('draft/:id')
  async deleteDraftHero(@Param('id') id: string, @Req() req) {
    return this.heroService.deleteDraftHero(Number(id), req.user.userId);
  }

  /**
   * 드래프트 → 정식 등록
   */
  @ApiOperation({ summary: '드래프트 → 정식 히어로 등록' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '정식 등록된 히어로 반환' })
  @UseGuards(JwtAuthGuard)
  @Post('draft/:id/complete')
  async completeDraftHero(@Param('id') id: string, @Req() req) {
    return this.heroService.completeDraftHero(Number(id), req.user.userId);
  }

  /**
   * 내 히어로 단건 조회
   */
  @ApiOperation({ summary: '내 히어로 단건 조회' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '내 히어로 정보 반환' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getHero(@Param('id') id: string, @Req() req) {
    return this.heroService.getHero(Number(id), req.user.userId);
  }

  /**
   * 정식 등록 히어로 수정
   */
  @ApiOperation({ summary: '정식 등록 히어로 수정' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateHeroDto })
  @ApiResponse({ status: 200, description: '수정된 히어로 반환' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateHero(
    @Param('id') id: string,
    @Body() dto: UpdateHeroDto,
    @Req() req,
  ) {
    return this.heroService.updateHero(Number(id), dto, req.user.userId);
  }

  /**
   * 정식 등록 히어로 삭제
   */
  @ApiOperation({ summary: '정식 등록 히어로 삭제' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteHero(@Param('id') id: string, @Req() req) {
    return this.heroService.deleteHero(Number(id), req.user.userId);
  }

  /**
   * 내 히어로 1개 활성화
   */
  @ApiOperation({ summary: '내 히어로 1개 활성화' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '성공시 message 반환' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/activate')
  async activateHero(@Param('id') id: string, @Req() req) {
    return this.heroService.activateHero(Number(id), req.user.userId);
  }

  /**
   * 내 히어로 1개 비활성화
   */
  @ApiOperation({ summary: '내 히어로 1개 비활성화' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '성공시 message 반환' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/deactivate')
  async deactivateHero(@Param('id') id: string, @Req() req) {
    return this.heroService.deactivateHero(Number(id), req.user.userId);
  }
}
