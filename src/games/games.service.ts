import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { ResponseBuilder } from '@app/response';
import { UpdateGamesDto, PlatformLinkDto } from './dto';
import { ContentEntityType } from '@prisma/client';

/**
 * 게임 뉴스/공개 게임 관련 서비스
 */
@Injectable()
export class GamesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 임시저장 생성 또는 조회 (1인 1개 원칙)
   * @param authorId 작성자(유저) ID
   * @returns 생성된 또는 기존 임시저장 draft 데이터 (파일, 플랫폼링크 포함)
   */
  async createOrGetDraft(authorId: string) {
    const allDrafts = await this.db.content.findMany({
      where: {
        authorId,
        type: ContentEntityType.GAMES_NEWS,
        publishedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    let draft = allDrafts[0];
    if (allDrafts.length > 1) {
      const idsToDelete = allDrafts.slice(1).map((d) => d.id);
      await this.db.content.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    if (draft) {
      const files = await this._getFilesForContent(draft.id);
      const platformLinks = await this._getPlatformLinksForContent(draft.id);
      return ResponseBuilder.OK_WITH({
        draft: { ...draft, files, platformLinks },
      });
    }

    const news = await this.db.content.create({
      data: {
        authorId,
        type: ContentEntityType.GAMES_NEWS,
        title: '',
        content: '',
      },
    });
    return ResponseBuilder.OK_WITH({
      draft: { ...news, files: [], platformLinks: [] },
    });
  }

  /**
   * 임시저장 수정
   * @param id 임시저장 ID
   * @param dto 수정할 데이터 DTO
   * @param userId 작성자(유저) ID
   * @returns 수정된 draft 데이터 (파일, 플랫폼링크 포함)
   * @throws NotFoundException 임시저장이 없을 때
   * @throws ForbiddenException 권한이 없거나 draft가 아닐 때
   */
  async updateDraft(id: number, dto: UpdateGamesDto, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('Draft not found');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.GAMES_NEWS ||
      news.publishedAt
    )
      throw new ForbiddenException('No permission or not a draft');

    const updated = await this.db.content.update({
      where: { id },
      data: { title: dto.title, content: dto.content },
    });

    if (dto.fileId) {
      await this.db.file.updateMany({
        where: {
          targetId: id,
          targetType: ContentEntityType.GAMES_NEWS,
          id: { not: dto.fileId },
        },
        data: { targetId: null, targetType: null },
      });
      await this.db.file.update({
        where: { id: dto.fileId },
        data: { targetId: id, targetType: ContentEntityType.GAMES_NEWS },
      });
    }

    if (dto.platformLinks) {
      await this._setPlatformLinks(id, dto.platformLinks);
    }

    const files = await this._getFilesForContent(id);
    const platformLinks = await this._getPlatformLinksForContent(id);
    return ResponseBuilder.OK_WITH({
      draft: { ...updated, files, platformLinks },
    });
  }

  /**
   * 임시저장 삭제
   * @param id 임시저장 ID
   * @param userId 작성자(유저) ID
   * @returns OK 응답
   * @throws NotFoundException 임시저장이 없을 때
   * @throws ForbiddenException 권한이 없거나 draft가 아닐 때
   */
  async deleteDraft(id: number, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('Draft not found');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.GAMES_NEWS ||
      news.publishedAt
    )
      throw new ForbiddenException('No permission or not a draft');

    await this.db.platformLink.deleteMany({ where: { contentId: id } });
    await this.db.content.delete({ where: { id } });
    return ResponseBuilder.OK();
  }

  /**
   * 임시저장 → 정식 등록
   * @param id 임시저장 ID
   * @param userId 작성자(유저) ID
   * @returns 정식 뉴스 데이터 (파일, 플랫폼링크 포함)
   * @throws NotFoundException 임시저장이 없을 때
   * @throws ForbiddenException 권한이 없거나 draft가 아닐 때
   */
  async completeDraft(id: number, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('Draft not found');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.GAMES_NEWS ||
      news.publishedAt
    )
      throw new ForbiddenException('No permission or not a draft');
    const published = await this.db.content.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
    const files = await this._getFilesForContent(id);
    const platformLinks = await this._getPlatformLinksForContent(id);
    return ResponseBuilder.OK_WITH({
      news: { ...published, files, platformLinks },
    });
  }

  /**
   * 뉴스 목록 (페이지네이션, keyword 없음)
   * @param userId 작성자(유저) ID
   * @param page 페이지 번호(1부터)
   * @param pageSize 페이지 당 개수
   * @returns 뉴스 리스트, 페이징 정보 포함
   */
  async getGamesList(userId: string, page: number = 1, pageSize: number = 10) {
    const where: any = {
      authorId: userId,
      type: ContentEntityType.GAMES_NEWS,
      publishedAt: { not: null },
    };

    const totalCount = await this.db.content.count({ where });
    const newsList = await this.db.content.findMany({
      where,
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const newsWithFilesAndPlatforms = await Promise.all(
      newsList.map(async (news) => {
        const files = await this._getFilesForContent(news.id);
        const platformLinks = await this._getPlatformLinksForContent(news.id);
        return { ...news, files, platformLinks };
      }),
    );

    return ResponseBuilder.OK_WITH({
      newsList: newsWithFilesAndPlatforms,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  }

  /**
   * 뉴스 상세 조회
   * @param id 뉴스 ID
   * @param userId 작성자(유저) ID
   * @returns 뉴스 단건 데이터 (파일, 플랫폼링크 포함)
   * @throws NotFoundException 뉴스가 없을 때
   * @throws ForbiddenException 권한이 없거나 정식 뉴스가 아닐 때
   */
  async getGames(id: number, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.GAMES_NEWS ||
      !news.publishedAt
    )
      throw new ForbiddenException('권한이 없거나 정식 뉴스가 아닙니다.');
    const files = await this._getFilesForContent(id);
    const platformLinks = await this._getPlatformLinksForContent(id);
    return ResponseBuilder.OK_WITH({ news: { ...news, files, platformLinks } });
  }

  /**
   * 뉴스 수정
   * @param id 뉴스 ID
   * @param dto 수정할 데이터 DTO
   * @param userId 작성자(유저) ID
   * @returns 수정된 뉴스 데이터 (파일, 플랫폼링크 포함)
   * @throws NotFoundException 뉴스가 없을 때
   * @throws ForbiddenException 권한이 없거나 정식 뉴스가 아닐 때
   */
  async updateGames(id: number, dto: UpdateGamesDto, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.GAMES_NEWS ||
      !news.publishedAt
    )
      throw new ForbiddenException('권한이 없거나 정식 뉴스가 아닙니다.');

    const updated = await this.db.content.update({
      where: { id },
      data: { title: dto.title, content: dto.content },
    });

    if (dto.fileId) {
      await this.db.file.updateMany({
        where: {
          targetId: id,
          targetType: ContentEntityType.GAMES_NEWS,
          id: { not: dto.fileId },
        },
        data: { targetId: null, targetType: null },
      });
      await this.db.file.update({
        where: { id: dto.fileId },
        data: { targetId: id, targetType: ContentEntityType.GAMES_NEWS },
      });
    }

    if (dto.platformLinks) {
      await this._setPlatformLinks(id, dto.platformLinks);
    }

    const files = await this._getFilesForContent(id);
    const platformLinks = await this._getPlatformLinksForContent(id);
    return ResponseBuilder.OK_WITH({
      news: { ...updated, files, platformLinks },
    });
  }

  /**
   * 뉴스 삭제
   * @param id 뉴스 ID
   * @param userId 작성자(유저) ID
   * @returns OK 응답
   * @throws NotFoundException 뉴스가 없을 때
   * @throws ForbiddenException 권한이 없거나 정식 뉴스가 아닐 때
   */
  async deleteGames(id: number, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.GAMES_NEWS ||
      !news.publishedAt
    )
      throw new ForbiddenException('권한이 없거나 정식 뉴스가 아닙니다.');

    await this.db.platformLink.deleteMany({ where: { contentId: id } });

    await this.db.file.updateMany({
      where: { targetId: id, targetType: ContentEntityType.GAMES_NEWS },
      data: { targetId: null, targetType: null },
    });

    await this.db.content.delete({ where: { id } });
    return ResponseBuilder.OK();
  }

  /**
   * 페이지네이션을 반영한 순서(order) 변경
   * @param ids 순서를 변경할 뉴스 ID 배열 (현재 페이지 내)
   * @param page 현재 페이지 번호
   * @param pageSize 페이지 당 개수
   * @returns OK 응답
   * @throws ForbiddenException 잘못된 id 배열이거나, 페이지 내 뉴스가 아닌 경우
   */
  async updateGamesOrder(
    ids: number[],
    page: number = 1,
    pageSize: number = 10,
  ) {
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((id) => typeof id !== 'number' || isNaN(id))
    ) {
      throw new ForbiddenException('잘못된 id 배열입니다.');
    }

    const pageStart = (page - 1) * pageSize;
    const games = await this.db.content.findMany({
      where: {
        type: ContentEntityType.GAMES_NEWS,
        publishedAt: { not: null },
      },
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      skip: pageStart,
      take: pageSize,
      select: { id: true, order: true },
    });

    const pageGameIds = games.map((g) => g.id);
    if (!ids.every((id) => pageGameIds.includes(id))) {
      throw new ForbiddenException(
        '현재 페이지에 없는 뉴스만 순서를 변경할 수 있습니다.',
      );
    }

    const allOrder = games.map((g) => g.order);
    const startOrder = allOrder.length > 0 ? Math.min(...allOrder) : pageStart;

    const updates = ids.map((id, idx) =>
      this.db.content.update({
        where: { id },
        data: { order: startOrder + idx },
      }),
    );
    await this.db.$transaction(updates);

    return ResponseBuilder.OK();
  }

  /**
   * 직접 입력 순서 변경: 페이지 내에서만 허용, 해당 id가 없으면 에러
   * @param id 순서를 변경할 뉴스 ID
   * @param newOrder 변경할 순서 인덱스(0부터)
   * @param userId 작성자(유저) ID
   * @param page 현재 페이지 번호
   * @param pageSize 페이지 당 개수
   * @returns OK 응답
   * @throws ForbiddenException 페이지 내 뉴스가 아니거나, 올바르지 않은 순서 값
   */
  async updateGamesOrderDirect(
    id: number,
    newOrder: number,
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const pageStart = (page - 1) * pageSize;
    const games = await this.db.content.findMany({
      where: {
        authorId: userId,
        type: ContentEntityType.GAMES_NEWS,
        publishedAt: { not: null },
      },
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      skip: pageStart,
      take: pageSize,
      select: { id: true, order: true },
    });

    const pageGameIds = games.map((g) => g.id);
    if (!pageGameIds.includes(id)) {
      throw new ForbiddenException(
        '현재 페이지에 있는 뉴스만 순서 변경이 가능합니다.',
      );
    }

    if (
      typeof newOrder !== 'number' ||
      newOrder < 0 ||
      newOrder >= games.length
    ) {
      throw new ForbiddenException('올바른 순서 값을 입력하세요.');
    }

    const reordered = [...games];
    const fromIdx = reordered.findIndex((g) => g.id === id);
    const [target] = reordered.splice(fromIdx, 1);
    reordered.splice(newOrder, 0, target);

    const startOrder = Math.min(...reordered.map((g) => g.order));
    const updates = reordered.map((g, idx) =>
      this.db.content.update({
        where: { id: g.id },
        data: { order: startOrder + idx },
      }),
    );
    await this.db.$transaction(updates);

    return ResponseBuilder.OK();
  }

  /**
   * 공개 게임 리스트 조회 (authorId 필요없음)
   * @param page 페이지 번호(1부터)
   * @param pageSize 페이지 당 개수
   * @returns 공개 게임 리스트, 페이징 정보 포함
   */
  async getPublicGamesList(page: number = 1, pageSize: number = 10) {
    const where: any = {
      type: ContentEntityType.GAMES_NEWS,
      publishedAt: { not: null },
    };

    const totalCount = await this.db.content.count({ where });
    const newsList = await this.db.content.findMany({
      where,
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const newsWithFilesAndPlatforms = await Promise.all(
      newsList.map(async (news) => {
        const files = await this._getFilesForContent(news.id);
        const platformLinks = await this._getPlatformLinksForContent(news.id);
        return { ...news, files, platformLinks };
      }),
    );

    return ResponseBuilder.OK_WITH({
      newsList: newsWithFilesAndPlatforms,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  }

  /**
   * 공개 게임 상세 조회 (authorId 필요없음)
   * @param id 뉴스 ID
   * @returns 공개 게임 상세 데이터 (파일, 플랫폼링크 포함)
   * @throws NotFoundException 공개 게임이 없거나 비공개일 때
   */
  async getPublicGameDetail(id: number) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (
      !news ||
      news.type !== ContentEntityType.GAMES_NEWS ||
      !news.publishedAt
    )
      throw new NotFoundException('공개 게임을 찾을 수 없습니다.');
    const files = await this._getFilesForContent(id);
    const platformLinks = await this._getPlatformLinksForContent(id);
    return ResponseBuilder.OK_WITH({ news: { ...news, files, platformLinks } });
  }

  // ------ PlatformLinks/FIles 관련 메서드 ------

  /**
   * 플랫폼 링크 저장
   * @param contentId 뉴스/콘텐츠 ID
   * @param platformLinks 플랫폼 링크 배열
   */
  private async _setPlatformLinks(
    contentId: number,
    platformLinks: PlatformLinkDto[],
  ) {
    await this.db.platformLink.deleteMany({ where: { contentId } });
    if (!platformLinks.length) return;
    await this.db.platformLink.createMany({
      data: platformLinks.map((pl) => ({
        contentId,
        platform: pl.platform,
        link: pl.link,
      })),
    });
  }

  /**
   * 특정 콘텐츠의 플랫폼 링크 조회
   * @param contentId 뉴스/콘텐츠 ID
   * @returns 플랫폼 링크 배열
   */
  private async _getPlatformLinksForContent(contentId: number) {
    return this.db.platformLink.findMany({
      where: { contentId },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * 특정 콘텐츠의 파일 리스트 조회
   * @param contentId 뉴스/콘텐츠 ID
   * @returns 파일 배열
   */
  private async _getFilesForContent(contentId: number) {
    return this.db.file.findMany({
      where: { targetId: contentId, targetType: ContentEntityType.GAMES_NEWS },
    });
  }
}
