import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { ResponseBuilder } from '@app/response';
import { CreatePromotionBannerDto, UpdatePromotionBannerDto } from './dto';

/**
 * 프로모션 배너(PromotionBanner) 비즈니스 로직 서비스
 */
@Injectable()
export class PromotionsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 내 프로모션 배너 목록 및 페이징
   * @param userId 사용자 ID
   * @param status 'draft' | 'active' | 'inactive'
   * @param page 페이지 번호(1부터)
   * @param pageSize 페이지 당 개수
   * @returns { banners, totalCount, page, pageSize, totalPages }
   */
  async getPromotionBanners(
    userId: string,
    status?: 'draft' | 'active' | 'inactive',
    page: number = 1,
    pageSize: number = 10,
  ) {
    let where: any = { authorId: userId };
    if (status === 'draft') where.isDraft = true;
    else if (status === 'active') {
      where.isDraft = false;
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isDraft = false;
      where.isActive = false;
    }

    const totalCount = await this.db.promotionBanner.count({ where });

    const banners = await this.db.promotionBanner.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const bannersWithFiles = await Promise.all(
      banners.map(async (banner) => {
        const files = await this.db.file.findMany({
          where: { targetId: banner.id, targetType: 'PROMOTION_BANNER' },
        });
        return { ...banner, files };
      }),
    );
    return ResponseBuilder.OK_WITH({
      banners: bannersWithFiles,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  }

  /**
   * 내 드래프트 배너 1개 조회 또는 생성(중복 생성 방지)
   * @param userId 사용자 ID
   * @param dto 드래프트 생성 데이터(선택)
   * @returns { draft }
   */
  async findOrCreateDraftByUser(
    userId: string,
    dto?: CreatePromotionBannerDto,
  ) {
    try {
      // 트랜잭션으로 동시성 문제 최소화
      return await this.db.$transaction(async (prisma) => {
        // 이미 존재하는 draft가 있으면 반환
        const draft = await prisma.promotionBanner.findFirst({
          where: { authorId: userId, isDraft: true },
          orderBy: { createdAt: 'desc' },
        });
        if (draft) {
          const files = await prisma.file.findMany({
            where: { targetId: draft.id, targetType: 'PROMOTION_BANNER' },
          });
          return ResponseBuilder.OK_WITH({ draft: { ...draft, files } });
        }
        // 없으면 새로 생성
        const banner = await prisma.promotionBanner.create({
          data: { ...dto, authorId: userId, isDraft: true, isActive: false },
        });
        await prisma.audit.create({
          data: {
            action: 'CREATE',
            status: 'PENDING',
            targetType: 'PROMOTION_BANNER',
            targetId: banner.id,
            authorId: userId,
            data: { new: { ...dto } },
          },
        });
        return ResponseBuilder.OK_WITH({ draft: { ...banner, files: [] } });
      });
    } catch (e: any) {
      // 유니크 에러 발생 시(동시에 생성 시도한 경우) → 기존 draft 반환
      if (e.code === 'P2002') {
        const draft = await this.db.promotionBanner.findFirst({
          where: { authorId: userId, isDraft: true },
          orderBy: { createdAt: 'desc' },
        });
        if (draft) {
          const files = await this.db.file.findMany({
            where: { targetId: draft.id, targetType: 'PROMOTION_BANNER' },
          });
          return ResponseBuilder.OK_WITH({ draft: { ...draft, files } });
        }
      }
      throw e;
    }
  }

  /**
   * 드래프트 배너 수정
   * @param bannerId 배너 ID
   * @param dto 수정 데이터 DTO
   * @param userId 사용자 ID
   * @returns { draft }
   * @throws NotFoundException 배너가 없을 때
   * @throws ForbiddenException 권한 없음/드래프트 아님
   */
  async updateDraftBanner(
    bannerId: number,
    dto: UpdatePromotionBannerDto,
    userId: string,
  ) {
    if (!bannerId && bannerId !== 0)
      throw new NotFoundException('배너 ID가 없습니다. - Update');
    const banner = await this.db.promotionBanner.findUnique({
      where: { id: bannerId },
    });
    if (!banner) throw new NotFoundException('Draft not found');
    if (banner.authorId !== userId || !banner.isDraft)
      throw new ForbiddenException('No permission or not a draft');

    const { title, content } = dto;
    const updated = await this.db.promotionBanner.update({
      where: { id: bannerId },
      data: { title, content },
    });

    if (dto.fileId) {
      await this.db.file.update({
        where: { id: dto.fileId },
        data: { targetId: bannerId, targetType: 'PROMOTION_BANNER' },
      });
    }

    await this.db.audit.create({
      data: {
        action: 'UPDATE',
        status: 'PENDING',
        targetType: 'PROMOTION_BANNER',
        targetId: bannerId,
        authorId: userId,
        data: { new: { title, content, fileId: dto.fileId } },
      },
    });

    const files = await this.db.file.findMany({
      where: { targetId: bannerId, targetType: 'PROMOTION_BANNER' },
    });
    return ResponseBuilder.OK_WITH({ draft: { ...updated, files } });
  }

  /**
   * 드래프트 배너 삭제
   * @param bannerId 배너 ID
   * @param userId 사용자 ID
   * @returns OK 응답
   * @throws NotFoundException 배너가 없을 때
   * @throws ForbiddenException 권한 없음/드래프트 아님
   */
  async deleteDraftBanner(bannerId: number, userId: string) {
    if (!bannerId && bannerId !== 0)
      throw new NotFoundException('배너 ID가 없습니다. - delete');
    const banner = await this.db.promotionBanner.findUnique({
      where: { id: bannerId },
    });
    if (!banner) throw new NotFoundException('Draft not found');
    if (banner.authorId !== userId || !banner.isDraft)
      throw new ForbiddenException('No permission or not a draft');
    await this.db.audit.create({
      data: {
        action: 'DELETE',
        status: 'PENDING',
        targetType: 'PROMOTION_BANNER',
        targetId: bannerId,
        authorId: userId,
        data: { old: banner },
      },
    });
    await this.db.promotionBanner.delete({ where: { id: bannerId } });
    return ResponseBuilder.OK();
  }

  /**
   * 드래프트 → 정식 등록
   * @param bannerId 배너 ID
   * @param userId 사용자 ID
   * @returns { banner }
   * @throws NotFoundException 배너가 없을 때
   * @throws ForbiddenException 권한 없음/드래프트 아님
   */
  async completeDraftBanner(bannerId: number, userId: string) {
    if (!bannerId && bannerId !== 0)
      throw new NotFoundException('배너 ID가 없습니다. -complete draft');
    const banner = await this.db.promotionBanner.findUnique({
      where: { id: bannerId },
    });
    if (!banner) throw new NotFoundException('Draft not found');
    if (banner.authorId !== userId || !banner.isDraft)
      throw new ForbiddenException('No permission or not a draft');
    const completed = await this.db.promotionBanner.update({
      where: { id: bannerId },
      data: { isDraft: false, isActive: false },
    });
    await this.db.audit.create({
      data: {
        action: 'UPDATE',
        status: 'COMPLETED',
        targetType: 'PROMOTION_BANNER',
        targetId: bannerId,
        authorId: userId,
        data: { completed: true },
      },
    });
    return ResponseBuilder.OK_WITH({ banner: completed });
  }

  /**
   * 정식 등록 배너 수정
   * @param bannerId 배너 ID
   * @param dto 수정 데이터 DTO
   * @param userId 사용자 ID
   * @returns { updatedBanner }
   * @throws NotFoundException 배너가 없을 때
   * @throws ForbiddenException 권한 없음/드래프트 상태
   */
  async updatePromotionBanner(
    bannerId: number,
    dto: UpdatePromotionBannerDto,
    userId: string,
  ) {
    if (!bannerId && bannerId !== 0)
      throw new NotFoundException('배너 ID가 없습니다. - update Promotion ');
    const banner = await this.db.promotionBanner.findUnique({
      where: { id: bannerId },
    });
    if (!banner) throw new NotFoundException('PromotionBanner not found');
    if (banner.authorId !== userId)
      throw new ForbiddenException('No permission to update');
    if (banner.isDraft)
      throw new ForbiddenException('Drafts must be completed before editing');

    const updated = await this.db.promotionBanner.update({
      where: { id: bannerId },
      data: dto,
    });
    await this.db.audit.create({
      data: {
        action: 'UPDATE',
        status: 'PENDING',
        targetType: 'PROMOTION_BANNER',
        targetId: bannerId,
        authorId: userId,
        data: { new: { ...dto } },
      },
    });
    return ResponseBuilder.OK_WITH({ updatedBanner: updated });
  }

  /**
   * 정식 등록 배너 삭제
   * @param bannerId 배너 ID
   * @param userId 사용자 ID
   * @returns OK 응답
   * @throws NotFoundException 배너가 없을 때
   * @throws ForbiddenException 권한 없음/드래프트 상태
   */
  async deletePromotionBanner(bannerId: number, userId: string) {
    if (!bannerId && bannerId !== 0)
      throw new NotFoundException('배너 ID가 없습니다. - delete');
    const banner = await this.db.promotionBanner.findUnique({
      where: { id: bannerId },
    });
    if (!banner) throw new NotFoundException('PromotionBanner not found');
    if (banner.authorId !== userId)
      throw new ForbiddenException('No permission to delete');
    if (banner.isDraft)
      throw new ForbiddenException(
        'Drafts는 이 API에서 삭제하지 않습니다. draft 전용 API 사용',
      );

    await this.db.file.updateMany({
      where: { targetId: bannerId, targetType: 'PROMOTION_BANNER' },
      data: { targetId: null, targetType: null },
    });

    await this.db.audit.create({
      data: {
        action: 'DELETE',
        status: 'PENDING',
        targetType: 'PROMOTION_BANNER',
        targetId: bannerId,
        authorId: userId,
        data: { old: banner },
      },
    });
    await this.db.promotionBanner.delete({ where: { id: bannerId } });
    return ResponseBuilder.OK();
  }

  /**
   * 내 배너 단건 조회
   * @param bannerId 배너 ID
   * @param userId 사용자 ID
   * @returns { banner }
   * @throws NotFoundException 배너가 없을 때
   * @throws ForbiddenException 권한 없음
   */
  async getPromotionBanner(bannerId: number, userId: string) {
    if (!bannerId && bannerId !== 0)
      throw new NotFoundException('배너 ID가 없습니다. - get Promotion');
    const banner = await this.db.promotionBanner.findUnique({
      where: { id: bannerId },
    });
    if (!banner) throw new NotFoundException('PromotionBanner not found');
    if (banner.authorId !== userId)
      throw new ForbiddenException('No permission to view');
    const files = await this.db.file.findMany({
      where: { targetId: bannerId, targetType: 'PROMOTION_BANNER' },
    });
    return ResponseBuilder.OK_WITH({ banner: { ...banner, files } });
  }

  /**
   * 배너 활성화 (내 배너만)
   * @param id 배너 ID
   * @param userId 사용자 ID
   * @returns { code, message, data }
   * @throws NotFoundException 배너가 없을 때
   * @throws ForbiddenException 권한 없음
   */
  async activatePromotionBanner(id: number, userId: string) {
    if (typeof id !== 'number')
      throw new NotFoundException('배너 ID가 없습니다. - active');
    const banner = await this.db.promotionBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('배너를 찾을 수 없습니다.');
    if (banner.authorId !== userId)
      throw new ForbiddenException('권한이 없습니다.');

    await this.db.promotionBanner.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date().toISOString(),
      },
    });
    return { code: 'SUCCESS', message: '배너 활성화', data: null };
  }

  /**
   * 배너 비활성화 (내 배너만)
   * @param id 배너 ID
   * @param userId 사용자 ID
   * @returns { code, message, data }
   * @throws NotFoundException 배너가 없을 때
   * @throws ForbiddenException 권한 없음
   */
  async deactivatePromotionBanner(id: number, userId: string) {
    if (typeof id !== 'number')
      throw new NotFoundException('배너 ID가 없습니다. - deactivate');
    const banner = await this.db.promotionBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('배너를 찾을 수 없습니다.');
    if (banner.authorId !== userId)
      throw new ForbiddenException('권한이 없습니다.');

    await this.db.promotionBanner.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date().toISOString(),
      },
    });
    return { code: 'SUCCESS', message: '배너 비활성화', data: null };
  }

  /**
   * 페이지네이션을 반영한 순서(order) 변경
   * @param ids 현재 페이지의 배너 ID 배열 (재정렬 순서)
   * @param page 현재 페이지 번호(1부터)
   * @param pageSize 페이지 당 개수
   * @returns OK 응답
   * @throws ForbiddenException 잘못된 id 배열/페이지 내 배너 아님
   */
  async updatePromotionBannerOrder(
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
    const banners = await this.db.promotionBanner.findMany({
      where: { isDraft: false },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      skip: pageStart,
      take: pageSize,
      select: { id: true, order: true },
    });

    const pageBannerIds = banners.map((b) => b.id);
    if (!ids.every((id) => pageBannerIds.includes(id))) {
      throw new ForbiddenException(
        '현재 페이지에 없는 배너는 순서를 변경할 수 없습니다.',
      );
    }

    const allOrder = banners.map((b) => b.order);
    const startOrder = allOrder.length > 0 ? Math.min(...allOrder) : pageStart;

    const updates = ids.map((id, idx) =>
      this.db.promotionBanner.update({
        where: { id },
        data: { order: startOrder + idx },
      }),
    );
    await this.db.$transaction(updates);

    return ResponseBuilder.OK();
  }

  /**
   * 직접 입력 순서 변경: 페이지 내에서만 허용, 해당 id가 없으면 에러
   * @param id 변경할 배너 ID
   * @param newOrder 새로 배정할 인덱스(0부터)
   * @param userId 사용자 ID
   * @param page 현재 페이지 번호
   * @param pageSize 페이지당 개수
   * @returns OK 응답
   * @throws ForbiddenException 페이지 내 배너가 아니거나, 올바르지 않은 순서 값
   */
  async updatePromotionBannerOrderDirect(
    id: number,
    newOrder: number,
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const pageStart = (page - 1) * pageSize;
    const banners = await this.db.promotionBanner.findMany({
      where: { isDraft: false, authorId: userId },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      skip: pageStart,
      take: pageSize,
      select: { id: true, order: true },
    });

    const pageBannerIds = banners.map((b) => b.id);
    if (!pageBannerIds.includes(id)) {
      throw new ForbiddenException(
        '현재 페이지에 있는 배너만 순서 변경이 가능합니다.',
      );
    }

    if (
      typeof newOrder !== 'number' ||
      newOrder < 0 ||
      newOrder >= banners.length
    ) {
      throw new ForbiddenException('올바른 순서 값을 입력하세요.');
    }

    const reordered = [...banners];
    const fromIdx = reordered.findIndex((b) => b.id === id);
    const [target] = reordered.splice(fromIdx, 1);
    reordered.splice(newOrder, 0, target);

    const startOrder = Math.min(...reordered.map((b) => b.order));
    const updates = reordered.map((b, idx) =>
      this.db.promotionBanner.update({
        where: { id: b.id },
        data: { order: startOrder + idx },
      }),
    );
    await this.db.$transaction(updates);

    return ResponseBuilder.OK();
  }

  /**
   * 전체 활성화된 프로모션 배너 목록(공개)
   * @returns { banners }
   */
  async getActivePromotionBanners() {
    const banners = await this.db.promotionBanner.findMany({
      where: { isDraft: false, isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // 각 배너에 파일 정보 포함
    const bannersWithFiles = await Promise.all(
      banners.map(async (banner) => {
        const files = await this.db.file.findMany({
          where: { targetId: banner.id, targetType: 'PROMOTION_BANNER' },
        });
        return { ...banner, files };
      }),
    );
    return ResponseBuilder.OK_WITH({ banners: bannersWithFiles });
  }
}
