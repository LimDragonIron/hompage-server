import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { ResponseBuilder } from '@app/response';
import { UpdateNewsDto } from './dto/news.dto';
import { ContentEntityType } from '@prisma/client';

/**
 * 뉴스(News) 비즈니스 로직 서비스
 */
@Injectable()
export class NewsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 임시저장 생성 또는 조회 (내 드래프트 1개만)
   * @param authorId 작성자(유저) ID
   * @returns { draft }
   */
  async createOrGetDraft(authorId: string) {
    const existDraft = await this.db.content.findFirst({
      where: { authorId, type: ContentEntityType.NEWS, publishedAt: null },
    });
    if (existDraft) {
      const hashtags = await this._getHashtagsForContent(existDraft.id);
      const files = await this._getFilesForContent(existDraft.id);
      return ResponseBuilder.OK_WITH({
        draft: { ...existDraft, hashtags, files },
      });
    }
    const news = await this.db.content.create({
      data: { authorId, type: ContentEntityType.NEWS, title: '', content: '' },
    });
    return ResponseBuilder.OK_WITH({
      draft: { ...news, hashtags: [], files: [] },
    });
  }

  /**
   * 임시저장 수정
   * @param id 드래프트 ID
   * @param dto 수정 데이터 DTO
   * @param userId 작성자(유저) ID
   * @returns { draft }
   * @throws NotFoundException 드래프트가 없을 때
   * @throws ForbiddenException 권한 없음/드래프트 아님
   */
  async updateDraft(id: number, dto: UpdateNewsDto, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('Draft not found');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.NEWS ||
      news.publishedAt
    )
      throw new ForbiddenException('No permission or not a draft');

    const updated = await this.db.content.update({
      where: { id },
      data: { title: dto.title, content: dto.content },
    });

    if (dto.hashtags) {
      await this._setContentHashtags(id, dto.hashtags);
    }
    if (dto.fileId) {
      await this.db.file.updateMany({
        where: {
          targetId: id,
          targetType: ContentEntityType.NEWS,
          id: { not: dto.fileId },
        },
        data: { targetId: null, targetType: null },
      });
      await this.db.file.update({
        where: { id: dto.fileId },
        data: { targetId: id, targetType: ContentEntityType.NEWS },
      });
    }
    const hashtags = await this._getHashtagsForContent(id);
    const files = await this._getFilesForContent(id);
    return ResponseBuilder.OK_WITH({ draft: { ...updated, hashtags, files } });
  }

  /**
   * 임시저장 삭제
   * @param id 드래프트 ID
   * @param userId 작성자(유저) ID
   * @returns OK 응답
   * @throws NotFoundException 드래프트가 없을 때
   * @throws ForbiddenException 권한 없음/드래프트 아님
   */
  async deleteDraft(id: number, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('Draft not found');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.NEWS ||
      news.publishedAt
    )
      throw new ForbiddenException('No permission or not a draft');
    await this.db.content.delete({ where: { id } });
    return ResponseBuilder.OK();
  }

  /**
   * 임시저장 완료(정식 등록)
   * @param id 드래프트 ID
   * @param userId 작성자(유저) ID
   * @returns { news }
   * @throws NotFoundException 드래프트가 없을 때
   * @throws ForbiddenException 권한 없음/드래프트 아님
   */
  async completeDraft(id: number, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('Draft not found');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.NEWS ||
      news.publishedAt
    )
      throw new ForbiddenException('No permission or not a draft');
    const published = await this.db.content.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
    const hashtags = await this._getHashtagsForContent(id);
    const files = await this._getFilesForContent(id);
    return ResponseBuilder.OK_WITH({ news: { ...published, hashtags, files } });
  }

  /**
   * 뉴스 순서(order) 일괄 편집 (페이지 내에서만)
   * @param ids 변경할 뉴스 ID 배열
   * @param page 현재 페이지 번호
   * @param pageSize 페이지당 개수
   * @returns OK 응답
   * @throws ForbiddenException 잘못된 id 배열/페이지 내 뉴스 아님
   */
  async updateNewsOrder(
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

    // 현재 페이지의 뉴스만 가능한지 확인
    const pageStart = (page - 1) * pageSize;
    const newsList = await this.db.content.findMany({
      where: {
        type: ContentEntityType.NEWS,
        publishedAt: { not: null },
      },
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      skip: pageStart,
      take: pageSize,
      select: { id: true, order: true },
    });

    const pageNewsIds = newsList.map((n) => n.id);
    if (!ids.every((id) => pageNewsIds.includes(id))) {
      throw new ForbiddenException(
        '현재 페이지에 없는 뉴스만 순서를 변경할 수 있습니다.',
      );
    }

    const allOrder = newsList.map((n) => n.order);
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
   * 뉴스 직접 순서 변경 (페이지 내에서만)
   * @param id 뉴스 ID
   * @param newOrder 변경할 순서 인덱스(0부터)
   * @param userId 작성자(유저) ID
   * @param page 현재 페이지 번호
   * @param pageSize 페이지당 개수
   * @returns OK 응답
   * @throws ForbiddenException 페이지 내 뉴스가 아니거나, 올바르지 않은 순서 값
   */
  async updateNewsOrderDirect(
    id: number,
    newOrder: number,
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const pageStart = (page - 1) * pageSize;
    const newsList = await this.db.content.findMany({
      where: {
        authorId: userId,
        type: ContentEntityType.NEWS,
        publishedAt: { not: null },
      },
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      skip: pageStart,
      take: pageSize,
      select: { id: true, order: true },
    });

    const pageNewsIds = newsList.map((n) => n.id);
    if (!pageNewsIds.includes(id)) {
      throw new ForbiddenException(
        '현재 페이지에 있는 뉴스만 순서 변경이 가능합니다.',
      );
    }

    if (
      typeof newOrder !== 'number' ||
      newOrder < 0 ||
      newOrder >= newsList.length
    ) {
      throw new ForbiddenException('올바른 순서 값을 입력하세요.');
    }

    // 해당 뉴스를 newOrder 위치로 이동
    const reordered = [...newsList];
    const fromIdx = reordered.findIndex((n) => n.id === id);
    const [target] = reordered.splice(fromIdx, 1);
    reordered.splice(newOrder, 0, target);

    const startOrder = Math.min(...reordered.map((n) => n.order));
    const updates = reordered.map((n, idx) =>
      this.db.content.update({
        where: { id: n.id },
        data: { order: startOrder + idx },
      }),
    );
    await this.db.$transaction(updates);

    return ResponseBuilder.OK();
  }

  /**
   * 내 뉴스 목록 (정식 등록, 페이지네이션)
   * @param userId 작성자(유저) ID
   * @param page 페이지 번호
   * @param pageSize 페이지당 개수
   * @returns { newsList, totalCount, page, pageSize, totalPages }
   */
  async getNewsList(userId: string, page: number = 1, pageSize: number = 10) {
    const where: any = {
      authorId: userId,
      type: ContentEntityType.NEWS,
      publishedAt: { not: null },
    };

    const totalCount = await this.db.content.count({ where });
    const newsList = await this.db.content.findMany({
      where,
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const newsWithHashAndFiles = await Promise.all(
      newsList.map(async (news) => {
        const hashtags = await this._getHashtagsForContent(news.id);
        const files = await this._getFilesForContent(news.id);
        return { ...news, hashtags, files };
      }),
    );

    return ResponseBuilder.OK_WITH({
      newsList: newsWithHashAndFiles,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  }

  /**
   * 내 뉴스 상세 조회
   * @param id 뉴스 ID
   * @param userId 작성자(유저) ID
   * @returns { news }
   * @throws NotFoundException 뉴스가 없을 때
   * @throws ForbiddenException 권한 없음/정식 뉴스 아님
   */
  async getNews(id: number, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.NEWS ||
      !news.publishedAt
    )
      throw new ForbiddenException('권한이 없거나 정식 뉴스가 아닙니다.');
    const hashtags = await this._getHashtagsForContent(id);
    const files = await this._getFilesForContent(id);
    return ResponseBuilder.OK_WITH({ news: { ...news, hashtags, files } });
  }

  /**
   * 내 뉴스 수정
   * @param id 뉴스 ID
   * @param dto 수정 데이터 DTO
   * @param userId 작성자(유저) ID
   * @returns { news }
   * @throws NotFoundException 뉴스가 없을 때
   * @throws ForbiddenException 권한 없음/정식 뉴스 아님
   */
  async updateNews(id: number, dto: UpdateNewsDto, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.NEWS ||
      !news.publishedAt
    )
      throw new ForbiddenException('권한이 없거나 정식 뉴스가 아닙니다.');

    const updated = await this.db.content.update({
      where: { id },
      data: { title: dto.title, content: dto.content },
    });

    if (dto.hashtags) {
      await this._setContentHashtags(id, dto.hashtags);
    }
    if (dto.fileId) {
      await this.db.file.updateMany({
        where: {
          targetId: id,
          targetType: ContentEntityType.NEWS,
          id: { not: dto.fileId },
        },
        data: { targetId: null, targetType: null },
      });
      await this.db.file.update({
        where: { id: dto.fileId },
        data: { targetId: id, targetType: ContentEntityType.NEWS },
      });
    }

    const hashtags = await this._getHashtagsForContent(id);
    const files = await this._getFilesForContent(id);
    return ResponseBuilder.OK_WITH({ news: { ...updated, hashtags, files } });
  }

  /**
   * 내 뉴스 삭제
   * @param id 뉴스 ID
   * @param userId 작성자(유저) ID
   * @returns OK 응답
   * @throws NotFoundException 뉴스가 없을 때
   * @throws ForbiddenException 권한 없음/정식 뉴스 아님
   */
  async deleteNews(id: number, userId: string) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news) throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    if (
      news.authorId !== userId ||
      news.type !== ContentEntityType.NEWS ||
      !news.publishedAt
    )
      throw new ForbiddenException('권한이 없거나 정식 뉴스가 아닙니다.');

    await this.db.file.updateMany({
      where: { targetId: id, targetType: ContentEntityType.NEWS },
      data: { targetId: null, targetType: null },
    });

    await this.db.content.delete({ where: { id } });
    return ResponseBuilder.OK();
  }

  /**
   * 공개 뉴스 리스트 (비회원)
   * @param page 페이지 번호
   * @param pageSize 페이지당 개수
   * @returns { newsList, totalCount, page, pageSize, totalPages }
   */
  async getPublicNewsList(page: number = 1, pageSize: number = 10) {
    const where: any = {
      type: ContentEntityType.NEWS,
      publishedAt: { not: null },
    };
    const totalCount = await this.db.content.count({ where });
    const newsList = await this.db.content.findMany({
      where,
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const newsWithHashAndFiles = await Promise.all(
      newsList.map(async (news) => {
        const hashtags = await this._getHashtagsForContent(news.id);
        const files = await this._getFilesForContent(news.id);
        return { ...news, hashtags, files };
      }),
    );

    return ResponseBuilder.OK_WITH({
      newsList: newsWithHashAndFiles,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  }

  /**
   * 공개 뉴스 상세 (비회원)
   * @param id 뉴스 ID
   * @returns { news }
   * @throws NotFoundException 뉴스가 없거나 비공개일 때
   */
  async getPublicNews(id: number) {
    const news = await this.db.content.findUnique({ where: { id } });
    if (!news || news.type !== ContentEntityType.NEWS || !news.publishedAt) {
      throw new NotFoundException('뉴스를 찾을 수 없습니다.');
    }
    const hashtags = await this._getHashtagsForContent(id);
    const files = await this._getFilesForContent(id);
    return ResponseBuilder.OK_WITH({ news: { ...news, hashtags, files } });
  }

  /**
   * 뉴스의 해시태그 설정 (모든 기존 해시태그 삭제 후 새로 설정)
   * @param contentId 뉴스 ID
   * @param tags 해시태그 배열
   */
  private async _setContentHashtags(contentId: number, tags: string[]) {
    await this.db.hashtagOnContent.deleteMany({ where: { contentId } });
    if (!tags.length) return;
    for (const tag of tags) {
      const hashtag = await this.db.hashtag.upsert({
        where: { tag },
        create: { tag },
        update: {},
      });
      await this.db.hashtagOnContent.create({
        data: { contentId, hashtagId: hashtag.id },
      });
    }
  }

  /**
   * 뉴스의 해시태그 조회
   * @param contentId 뉴스 ID
   * @returns 해시태그 문자열 배열
   */
  private async _getHashtagsForContent(contentId: number) {
    const records = await this.db.hashtagOnContent.findMany({
      where: { contentId },
      include: { hashtag: true },
    });
    return records.map((r) => r.hashtag.tag);
  }

  /**
   * 뉴스의 파일 목록 조회
   * @param contentId 뉴스 ID
   * @returns 파일 배열
   */
  private async _getFilesForContent(contentId: number) {
    return this.db.file.findMany({
      where: { targetId: contentId, targetType: ContentEntityType.NEWS },
    });
  }
}
