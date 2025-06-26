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
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { NewsService } from './news.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
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
 * 뉴스(News) 관련 컨트롤러
 */
@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  /**
   * 공개 뉴스 리스트 (비회원/비로그인도 가능)
   */
  @ApiOperation({ summary: '공개 뉴스 리스트 조회 (비회원/공개)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: '공개 뉴스 리스트와 페이징 정보 반환',
  })
  @Get('/public')
  @Public()
  async getPublicNewsList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.newsService.getPublicNewsList(pageNum, pageSizeNum);
  }

  /**
   * 공개 뉴스 상세
   */
  @ApiOperation({ summary: '공개 뉴스 상세 조회 (비회원/공개)' })
  @ApiParam({ name: 'id', type: Number, description: '뉴스 ID' })
  @ApiResponse({ status: 200, description: '공개 뉴스 상세 데이터 반환' })
  @Get('/public/:id')
  @Public()
  async getPublicNews(@Param('id') id: number) {
    return this.newsService.getPublicNews(+id);
  }

  /**
   * 임시저장 draft 생성 or 조회 (로그인 필요)
   */
  @ApiOperation({ summary: '임시저장 draft 생성 또는 조회 (내 드래프트 1개)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: '드래프트 뉴스 반환' })
  @UseGuards(JwtAuthGuard)
  @Post('draft-or-create')
  async createOrFetchDraft(@Req() req) {
    return this.newsService.createOrGetDraft(req.user.userId);
  }

  /**
   * 임시저장 draft 수정
   */
  @ApiOperation({ summary: '임시저장 draft 수정' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateNewsDto })
  @ApiResponse({ status: 200, description: '수정된 드래프트 반환' })
  @UseGuards(JwtAuthGuard)
  @Patch('draft/:id')
  async updateDraft(
    @Param('id') id: number,
    @Body() dto: UpdateNewsDto,
    @Req() req,
  ) {
    return this.newsService.updateDraft(+id, dto, req.user.userId);
  }

  /**
   * 임시저장 draft 삭제
   */
  @ApiOperation({ summary: '임시저장 draft 삭제' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard)
  @Delete('draft/:id')
  async deleteDraft(@Param('id') id: number, @Req() req) {
    return this.newsService.deleteDraft(+id, req.user.userId);
  }

  /**
   * 임시저장 → 정식 등록
   */
  @ApiOperation({ summary: '임시저장 → 정식 뉴스 등록' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: '정식 등록된 뉴스 반환' })
  @UseGuards(JwtAuthGuard)
  @Post('draft/:id/complete')
  async completeDraft(@Param('id') id: number, @Req() req) {
    return this.newsService.completeDraft(+id, req.user.userId);
  }

  /**
   * 뉴스 순서(order) 일괄 편집 (페이지 내에서만)
   */
  @ApiOperation({ summary: '뉴스 순서(order) 일괄 편집 (페이지 단위, 관리자)' })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      example: { ids: [1, 2, 3] },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard)
  @Patch('order')
  async updateNewsOrder(
    @Body() dto: { ids: (number | string)[] },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const ids = Array.isArray(dto.ids)
      ? dto.ids.map((id) => Number(id)).filter((id) => !isNaN(id))
      : [];
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.newsService.updateNewsOrder(ids, pageNum, pageSizeNum);
  }

  /**
   * 뉴스 직접 순서 변경 (페이지 내에서만)
   */
  @ApiOperation({ summary: '뉴스 직접 순서 변경 (페이지 단위, 관리자)' })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      example: { id: 1, newOrder: 2 },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard)
  @Patch('order/direct')
  async updateNewsOrderDirect(
    @Req() req,
    @Body() dto: { id: number; newOrder: number },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.newsService.updateNewsOrderDirect(
      Number(dto.id),
      Number(dto.newOrder),
      req.user.userId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * 내 뉴스 목록 (정식 등록, 페이지네이션)
   */
  @ApiOperation({ summary: '내 뉴스 목록 조회 (정식 등록, 페이지네이션)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: '내 뉴스 리스트 반환' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async getNewsList(
    @Req() req,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.newsService.getNewsList(req.user.userId, pageNum, pageSizeNum);
  }

  /**
   * 내 뉴스 상세
   */
  @ApiOperation({ summary: '내 뉴스 단건 조회' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '내 뉴스 상세 반환' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getNews(@Param('id') id: number, @Req() req) {
    return this.newsService.getNews(+id, req.user.userId);
  }

  /**
   * 내 뉴스 수정
   */
  @ApiOperation({ summary: '내 뉴스 수정' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateNewsDto })
  @ApiResponse({ status: 200, description: '수정된 뉴스 반환' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateNews(
    @Param('id') id: number,
    @Body() dto: UpdateNewsDto,
    @Req() req,
  ) {
    return this.newsService.updateNews(+id, dto, req.user.userId);
  }

  /**
   * 내 뉴스 삭제
   */
  @ApiOperation({ summary: '내 뉴스 삭제' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteNews(@Param('id') id: number, @Req() req) {
    return this.newsService.deleteNews(+id, req.user.userId);
  }
}
