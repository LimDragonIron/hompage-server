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
import { GamesService } from './games.service';
import { UpdateGamesDto, CreateGamesDto, PlatformLinkDto } from './dto';
import { Public } from '@app/decorators';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * 게임 뉴스/공개 게임 관련 API
 */
@ApiTags('Games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * 공개 게임 리스트 조회 (비회원/공개)
   */
  @ApiOperation({ summary: '공개 게임 리스트 조회 (공개)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: '공개 게임 리스트와 페이징 정보 반환',
  })
  @Get('public')
  @Public()
  async getPublicGamesList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.gamesService.getPublicGamesList(pageNum, pageSizeNum);
  }

  /**
   * 공개 게임 상세 조회 (비회원/공개)
   */
  @ApiOperation({ summary: '공개 게임 상세 조회 (공개)' })
  @ApiParam({ name: 'id', type: Number, description: '게임 뉴스 ID' })
  @ApiResponse({ status: 200, description: '공개 게임 상세 데이터 반환' })
  @Get('public/:id')
  @Public()
  async getPublicGameDetail(@Param('id') id: number) {
    return this.gamesService.getPublicGameDetail(+id);
  }

  /**
   * 뉴스 순서 (order) 일괄 편집 (관리자)
   */
  @ApiOperation({ summary: '뉴스 순서(order) 일괄 편집 (관리자)' })
  @ApiBody({
    schema: {
      example: { ids: [1, 2, 3] },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiBearerAuth()
  @Patch('order')
  @UseGuards(JwtAuthGuard)
  async updateGamesOrder(
    @Body() dto: { ids: (string | number)[] },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const ids = Array.isArray(dto.ids)
      ? dto.ids.map((id) => Number(id)).filter((id) => !isNaN(id))
      : [];
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.gamesService.updateGamesOrder(ids, pageNum, pageSizeNum);
  }

  /**
   * 뉴스 직접 순서 변경 (관리자)
   */
  @ApiOperation({ summary: '뉴스 직접 순서 변경 (관리자)' })
  @ApiBody({
    schema: {
      example: { id: 123, newOrder: 1 },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiBearerAuth()
  @Patch('order/direct')
  @UseGuards(JwtAuthGuard)
  async updateGamesOrderDirect(
    @Req() req,
    @Body() dto: { id: number; newOrder: number },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.gamesService.updateGamesOrderDirect(
      Number(dto.id),
      Number(dto.newOrder),
      req.user.userId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * 임시저장 draft 생성 or 조회 (관리자)
   */
  @ApiOperation({ summary: '임시저장 draft 생성 or 조회 (1인 1개, 관리자)' })
  @ApiBearerAuth()
  @Post('draft-or-create')
  @UseGuards(JwtAuthGuard)
  async createOrFetchDraft(@Req() req) {
    return this.gamesService.createOrGetDraft(req.user.userId);
  }

  /**
   * 임시저장 draft 수정 (관리자)
   */
  @ApiOperation({ summary: '임시저장 draft 수정 (관리자)' })
  @ApiBody({ type: UpdateGamesDto })
  @ApiParam({ name: 'id', type: Number, description: '임시저장 ID' })
  @ApiBearerAuth()
  @Patch('draft/:id')
  @UseGuards(JwtAuthGuard)
  async updateDraft(
    @Param('id') id: number,
    @Body() dto: UpdateGamesDto,
    @Req() req,
  ) {
    return this.gamesService.updateDraft(+id, dto, req.user.userId);
  }

  /**
   * 임시저장 draft 삭제 (관리자)
   */
  @ApiOperation({ summary: '임시저장 draft 삭제 (관리자)' })
  @ApiParam({ name: 'id', type: Number, description: '임시저장 ID' })
  @ApiBearerAuth()
  @Delete('draft/:id')
  @UseGuards(JwtAuthGuard)
  async deleteDraft(@Param('id') id: number, @Req() req) {
    return this.gamesService.deleteDraft(+id, req.user.userId);
  }

  /**
   * 임시저장 → 정식 등록 (관리자)
   */
  @ApiOperation({ summary: '임시저장 → 정식 등록 (관리자)' })
  @ApiParam({ name: 'id', type: Number, description: '임시저장 ID' })
  @ApiBearerAuth()
  @Post('draft/:id/complete')
  @UseGuards(JwtAuthGuard)
  async completeDraft(@Param('id') id: number, @Req() req) {
    return this.gamesService.completeDraft(+id, req.user.userId);
  }

  /**
   * 뉴스 목록 (관리자, 페이지네이션)
   */
  @ApiOperation({ summary: '뉴스 목록 (관리자/페이징)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiBearerAuth()
  @Get()
  @UseGuards(JwtAuthGuard)
  async getGamesList(
    @Req() req,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const pageSizeNum = pageSize ? Math.max(Number(pageSize), 1) : 10;
    return this.gamesService.getGamesList(
      req.user.userId,
      pageNum,
      pageSizeNum,
    );
  }

  /**
   * 뉴스 상세 조회 (관리자)
   */
  @ApiOperation({ summary: '뉴스 상세 조회 (관리자)' })
  @ApiParam({ name: 'id', type: Number, description: '뉴스 ID' })
  @ApiBearerAuth()
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getGames(@Param('id') id: number, @Req() req) {
    return this.gamesService.getGames(+id, req.user.userId);
  }

  /**
   * 뉴스 수정 (관리자)
   */
  @ApiOperation({ summary: '뉴스 수정 (관리자)' })
  @ApiBody({ type: UpdateGamesDto })
  @ApiParam({ name: 'id', type: Number, description: '뉴스 ID' })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateGames(
    @Param('id') id: number,
    @Body() dto: UpdateGamesDto,
    @Req() req,
  ) {
    return this.gamesService.updateGames(+id, dto, req.user.userId);
  }

  /**
   * 뉴스 삭제 (관리자)
   */
  @ApiOperation({ summary: '뉴스 삭제 (관리자)' })
  @ApiParam({ name: 'id', type: Number, description: '뉴스 ID' })
  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteGames(@Param('id') id: number, @Req() req) {
    return this.gamesService.deleteGames(+id, req.user.userId);
  }
}
