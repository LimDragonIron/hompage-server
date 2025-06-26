import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { CreatePromotionBannerDto, UpdatePromotionBannerDto } from './dto';
import { Public } from '@app/decorators';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * 프로모션 배너(PromotionBanner) 관련 컨트롤러
 */
@ApiTags('PromotionBanner')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  /**
   * 내 프로모션 배너 목록(상태별, 페이지네이션)
   */
  @ApiOperation({ summary: '내 프로모션 배너 목록(상태별, 페이지네이션)' })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'active', 'inactive'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @UseGuards(JwtAuthGuard)
  @Get()
  async getPromotionBanners(
    @Req() req,
    @Query('status') status?: 'draft' | 'active' | 'inactive',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.promotionsService.getPromotionBanners(
      req.user.userId,
      status,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * 전체 활성화된 프로모션 배너 목록(공개)
   */
  @ApiOperation({ summary: '활성화된 프로모션 배너 전체 목록 (공개)' })
  @Get('active')
  @Public()
  async getActivePromotionBanners() {
    return this.promotionsService.getActivePromotionBanners();
  }

  /**
   * 프로모션 배너 순서(order) 일괄 편집 (페이지 단위)
   */
  @ApiOperation({ summary: '배너 순서(order) 일괄 편집 (페이지 단위, 관리자)' })
  @ApiBearerAuth()
  @ApiBody({ schema: { example: { ids: [1, 2, 3] } } })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @Patch('order')
  @UseGuards(JwtAuthGuard)
  async updatePromotionBannerOrder(
    @Body() dto: { ids: (string | number)[] },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;

    const ids = Array.isArray(dto.ids)
      ? dto.ids.map((id) => Number(id)).filter((id) => !isNaN(id))
      : [];
    return this.promotionsService.updatePromotionBannerOrder(
      ids,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * 프로모션 배너 직접 순서 변경 (페이지 단위)
   */
  @ApiOperation({ summary: '배너 직접 순서 변경 (페이지 단위, 관리자)' })
  @ApiBearerAuth()
  @ApiBody({ schema: { example: { id: 1, newOrder: 2 } } })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @Patch('order/direct')
  @UseGuards(JwtAuthGuard)
  async updatePromotionBannerOrderDirect(
    @Req() req,
    @Body() dto: { id: number; newOrder: number },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.promotionsService.updatePromotionBannerOrderDirect(
      Number(dto.id),
      Number(dto.newOrder),
      req.user.userId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * 드래프트 배너 생성/조회 (내 드래프트 1개)
   */
  @ApiOperation({ summary: '내 드래프트 배너 생성 또는 조회' })
  @ApiBearerAuth()
  @ApiBody({ type: CreatePromotionBannerDto })
  @Post('draft-or-create')
  @UseGuards(JwtAuthGuard)
  async findOrCreateDraftPromotionBanner(
    @Req() req,
    @Body() dto: CreatePromotionBannerDto,
  ) {
    return this.promotionsService.findOrCreateDraftByUser(req.user.userId, dto);
  }

  /**
   * 드래프트 배너 수정
   */
  @ApiOperation({ summary: '드래프트 배너 수정' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePromotionBannerDto })
  @Patch('draft/:id')
  @UseGuards(JwtAuthGuard)
  async updateDraftBanner(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionBannerDto,
    @Req() req,
  ) {
    return this.promotionsService.updateDraftBanner(
      Number(id),
      dto,
      req.user.userId,
    );
  }

  /**
   * 드래프트 배너 삭제
   */
  @ApiOperation({ summary: '드래프트 배너 삭제' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @Delete('draft/:id')
  @UseGuards(JwtAuthGuard)
  async deleteDraftBanner(@Param('id') id: string, @Req() req) {
    return this.promotionsService.deleteDraftBanner(
      Number(id),
      req.user.userId,
    );
  }

  /**
   * 드래프트 → 정식 배너 등록
   */
  @ApiOperation({ summary: '드래프트 → 정식 배너 등록' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @Post('draft/:id/complete')
  @UseGuards(JwtAuthGuard)
  async completeDraftBanner(@Param('id') id: string, @Req() req) {
    return this.promotionsService.completeDraftBanner(
      Number(id),
      req.user.userId,
    );
  }

  /**
   * 내 배너 단건 조회
   */
  @ApiOperation({ summary: '내 배너 단건 조회' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPromotionBanner(@Param('id') id: string, @Req() req) {
    return this.promotionsService.getPromotionBanner(
      Number(id),
      req.user.userId,
    );
  }

  /**
   * 배너 활성화
   */
  @ApiOperation({ summary: '프로모션 배너 활성화' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard)
  async activatePromotionBanner(@Param('id') id: string, @Req() req) {
    return this.promotionsService.activatePromotionBanner(
      Number(id),
      req.user.userId,
    );
  }

  /**
   * 배너 비활성화
   */
  @ApiOperation({ summary: '프로모션 배너 비활성화' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  async deactivatePromotionBanner(@Param('id') id: string, @Req() req) {
    return this.promotionsService.deactivatePromotionBanner(
      Number(id),
      req.user.userId,
    );
  }

  /**
   * 정식 등록 배너 수정
   */
  @ApiOperation({ summary: '정식 등록 배너 수정' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePromotionBannerDto })
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePromotionBanner(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionBannerDto,
    @Req() req,
  ) {
    return this.promotionsService.updatePromotionBanner(
      Number(id),
      dto,
      req.user.userId,
    );
  }

  /**
   * 정식 등록 배너 삭제
   */
  @ApiOperation({ summary: '정식 등록 배너 삭제' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePromotionBanner(@Param('id') id: string, @Req() req) {
    return this.promotionsService.deletePromotionBanner(
      Number(id),
      req.user.userId,
    );
  }
}
