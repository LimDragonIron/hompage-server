import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { ResponseBuilder } from '@app/response';
import { CreateHeroDto, UpdateHeroDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

/**
 * 히어로(Hero) 비즈니스 로직 서비스
 */
@ApiTags('Hero')
@Injectable()
export class HeroService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 내 히어로 전체 목록 조회 (상태별, 페이지네이션)
   * @param userId 사용자 ID
   * @param status 'draft', 'active', 'inactive' 중 하나 (옵션)
   * @param page 페이지 번호 (1부터, 기본 1)
   * @param pageSize 페이지 당 개수 (기본 10)
   * @returns {heroes, totalCount, page, pageSize, totalPages}
   */
  async getHeroes(
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

    const totalCount = await this.db.hero.count({ where });

    const heroes = await this.db.hero.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const heroesWithFiles = await Promise.all(
      heroes.map(async (hero) => {
        const files = await this.db.file.findMany({
          where: { targetId: hero.id, targetType: 'HERO' },
        });
        return { ...hero, files };
      }),
    );
    return ResponseBuilder.OK_WITH({
      heroes: heroesWithFiles,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  }

  /**
   * 내 드래프트 히어로 1개 조회 또는 생성
   * @param userId 사용자 ID
   * @param dto 드래프트 생성 데이터(선택)
   * @returns { draft }
   */
  async findOrCreateDraftByUser(userId: string, dto?: CreateHeroDto) {
    try {
      return await this.db.$transaction(async (prisma) => {
        // 기존 드래프트 있으면 반환
        const draft = await prisma.hero.findFirst({
          where: { authorId: userId, isDraft: true },
          orderBy: { createdAt: 'desc' },
        });
        if (draft) {
          const files = await prisma.file.findMany({
            where: { targetId: draft.id, targetType: 'HERO' },
          });
          return ResponseBuilder.OK_WITH({ draft: { ...draft, files } });
        }
        // 없으면 새로 생성
        const hero = await prisma.hero.create({
          data: { ...dto, authorId: userId, isDraft: true, isActive: false },
        });
        await prisma.audit.create({
          data: {
            action: 'CREATE',
            status: 'PENDING',
            targetType: 'HERO',
            targetId: hero.id,
            authorId: userId,
            data: { new: { ...dto } },
          },
        });
        return ResponseBuilder.OK_WITH({ draft: { ...hero, files: [] } });
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        // 유니크 제약 위반시(동시에 생성 시도)
        const draft = await this.db.hero.findFirst({
          where: { authorId: userId, isDraft: true },
          orderBy: { createdAt: 'desc' },
        });
        if (draft) {
          const files = await this.db.file.findMany({
            where: { targetId: draft.id, targetType: 'HERO' },
          });
          return ResponseBuilder.OK_WITH({ draft: { ...draft, files } });
        }
      }
      throw e;
    }
  }

  /**
   * 드래프트 히어로 수정
   * @param heroId 드래프트 히어로 ID
   * @param dto 수정 데이터
   * @param userId 사용자 ID
   * @returns { draft }
   * @throws NotFoundException 드래프트 없는 경우
   * @throws ForbiddenException 권한 없음/드래프트 아님
   */
  async updateDraftHero(heroId: number, dto: UpdateHeroDto, userId: string) {
    if (!heroId && heroId !== 0)
      throw new NotFoundException('히어로 ID가 없습니다. - Update');
    const hero = await this.db.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new NotFoundException('Draft not found');
    if (hero.authorId !== userId || !hero.isDraft)
      throw new ForbiddenException('No permission or not a draft');

    const { title, content } = dto;
    const updated = await this.db.hero.update({
      where: { id: heroId },
      data: { title, content },
    });

    if ((dto as any).fileId) {
      await this.db.file.update({
        where: { id: (dto as any).fileId },
        data: { targetId: heroId, targetType: 'HERO' },
      });
    }

    await this.db.audit.create({
      data: {
        action: 'UPDATE',
        status: 'PENDING',
        targetType: 'HERO',
        targetId: heroId,
        authorId: userId,
        data: { new: { title, content, fileId: (dto as any).fileId } },
      },
    });

    const files = await this.db.file.findMany({
      where: { targetId: heroId, targetType: 'HERO' },
    });
    return ResponseBuilder.OK_WITH({ draft: { ...updated, files } });
  }

  /**
   * 드래프트 히어로 삭제
   * @param heroId 드래프트 히어로 ID
   * @param userId 사용자 ID
   * @returns OK 응답
   * @throws NotFoundException 드래프트 없는 경우
   * @throws ForbiddenException 권한 없음/드래프트 아님
   */
  async deleteDraftHero(heroId: number, userId: string) {
    if (!heroId && heroId !== 0)
      throw new NotFoundException('히어로 ID가 없습니다. - delete');
    const hero = await this.db.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new NotFoundException('Draft not found');
    if (hero.authorId !== userId || !hero.isDraft)
      throw new ForbiddenException('No permission or not a draft');
    await this.db.audit.create({
      data: {
        action: 'DELETE',
        status: 'PENDING',
        targetType: 'HERO',
        targetId: heroId,
        authorId: userId,
        data: { old: hero },
      },
    });
    await this.db.hero.delete({ where: { id: heroId } });
    return ResponseBuilder.OK();
  }

  /**
   * 드래프트 → 정식 등록
   * @param heroId 드래프트 히어로 ID
   * @param userId 사용자 ID
   * @returns { hero }
   * @throws NotFoundException 드래프트 없는 경우
   * @throws ForbiddenException 권한 없음/드래프트 아님
   */
  async completeDraftHero(heroId: number, userId: string) {
    if (!heroId && heroId !== 0)
      throw new NotFoundException('히어로 ID가 없습니다. -complete draft');

    return this.db.$transaction(async (prisma) => {
      const hero = await prisma.hero.findUnique({ where: { id: heroId } });
      if (!hero) throw new NotFoundException('Draft not found');
      if (hero.authorId !== userId || !hero.isDraft)
        throw new ForbiddenException('No permission or not a draft');

      // 드래프트 완료 처리
      const completed = await prisma.hero.update({
        where: { id: heroId },
        data: { isDraft: false, isActive: false },
      });

      // 혹시라도 같은 authorId, isDraft=true가 또 있으면 정리 (예: 중복 생성된 드래프트)
      await prisma.hero.deleteMany({
        where: {
          authorId: userId,
          isDraft: true,
          id: { not: heroId },
        },
      });

      await prisma.audit.create({
        data: {
          action: 'UPDATE',
          status: 'COMPLETED',
          targetType: 'HERO',
          targetId: heroId,
          authorId: userId,
          data: { completed: true },
        },
      });

      return ResponseBuilder.OK_WITH({ hero: completed });
    });
  }

  /**
   * 정식 등록 히어로 수정
   * @param heroId 히어로 ID
   * @param dto 수정 데이터
   * @param userId 사용자 ID
   * @returns { updatedHero }
   * @throws NotFoundException 히어로 없는 경우
   * @throws ForbiddenException 권한 없음/드래프트 상태
   */
  async updateHero(heroId: number, dto: UpdateHeroDto, userId: string) {
    if (!heroId && heroId !== 0)
      throw new NotFoundException('히어로 ID가 없습니다. - update Hero');
    const hero = await this.db.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new NotFoundException('Hero not found');
    if (hero.authorId !== userId)
      throw new ForbiddenException('No permission to update');
    if (hero.isDraft)
      throw new ForbiddenException('Drafts must be completed before editing');

    const updated = await this.db.hero.update({
      where: { id: heroId },
      data: dto,
    });
    await this.db.audit.create({
      data: {
        action: 'UPDATE',
        status: 'PENDING',
        targetType: 'HERO',
        targetId: heroId,
        authorId: userId,
        data: { new: { ...dto } },
      },
    });
    return ResponseBuilder.OK_WITH({ updatedHero: updated });
  }

  /**
   * 정식 등록 히어로 삭제
   * @param heroId 히어로 ID
   * @param userId 사용자 ID
   * @returns OK 응답
   * @throws NotFoundException 히어로 없는 경우
   * @throws ForbiddenException 권한 없음/드래프트 상태
   */
  async deleteHero(heroId: number, userId: string) {
    if (!heroId && heroId !== 0)
      throw new NotFoundException('히어로 ID가 없습니다. - delete');
    const hero = await this.db.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new NotFoundException('Hero not found');
    if (hero.authorId !== userId)
      throw new ForbiddenException('No permission to delete');
    if (hero.isDraft)
      throw new ForbiddenException(
        'Drafts는 이 API에서 삭제하지 않습니다. draft 전용 API 사용',
      );

    await this.db.file.updateMany({
      where: { targetId: heroId, targetType: 'HERO' },
      data: { targetId: null, targetType: null },
    });

    await this.db.audit.create({
      data: {
        action: 'DELETE',
        status: 'PENDING',
        targetType: 'HERO',
        targetId: heroId,
        authorId: userId,
        data: { old: hero },
      },
    });
    await this.db.hero.delete({ where: { id: heroId } });
    return ResponseBuilder.OK();
  }

  /**
   * 내 히어로 단건 상세 조회
   * @param heroId 히어로 ID
   * @param userId 사용자 ID
   * @returns { hero }
   * @throws NotFoundException 히어로 없는 경우
   * @throws ForbiddenException 권한 없음
   */
  async getHero(heroId: number, userId: string) {
    if (!heroId && heroId !== 0)
      throw new NotFoundException('히어로 ID가 없습니다. - get Hero');
    const hero = await this.db.hero.findUnique({ where: { id: heroId } });
    if (!hero) throw new NotFoundException('Hero not found');
    if (hero.authorId !== userId)
      throw new ForbiddenException('No permission to view');
    const files = await this.db.file.findMany({
      where: { targetId: heroId, targetType: 'HERO' },
    });
    return ResponseBuilder.OK_WITH({ hero: { ...hero, files } });
  }

  /**
   * 내 히어로 1개 활성화 (다른 활성화 히어로 자동 비활성화)
   * @param id 히어로 ID
   * @param userId 사용자 ID
   * @returns { message }
   * @throws NotFoundException 히어로 없는 경우
   * @throws ForbiddenException 권한 없음
   */
  async activateHero(id: number, userId: string) {
    if (typeof id !== 'number')
      throw new NotFoundException('히어로 ID가 없습니다. - active');
    const hero = await this.db.hero.findUnique({ where: { id } });
    if (!hero) throw new NotFoundException('히어로를 찾을 수 없습니다.');
    if (hero.authorId !== userId)
      throw new ForbiddenException('권한이 없습니다.');

    // 기존 히어로 비활성화
    await this.db.hero.updateMany({
      where: { authorId: userId, isActive: true },
      data: { isActive: false },
    });

    // 하나만 활성화
    await this.db.hero.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date().toISOString(),
      },
    });
    return ResponseBuilder.OK_WITH({ message: '히어로 활성화' });
  }

  /**
   * 내 히어로 1개 비활성화
   * @param id 히어로 ID
   * @param userId 사용자 ID
   * @returns { message }
   * @throws NotFoundException 히어로 없는 경우
   * @throws ForbiddenException 권한 없음
   */
  async deactivateHero(id: number, userId: string) {
    if (typeof id !== 'number')
      throw new NotFoundException('히어로 ID가 없습니다. - deactivate');
    const hero = await this.db.hero.findUnique({ where: { id } });
    if (!hero) throw new NotFoundException('히어로를 찾을 수 없습니다.');
    if (hero.authorId !== userId)
      throw new ForbiddenException('권한이 없습니다.');

    await this.db.hero.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date().toISOString(),
      },
    });
    return ResponseBuilder.OK_WITH({ message: '히어로 비활성화' });
  }

  /**
   * 전체 활성화 히어로 목록 조회 (공개, draft 제외)
   * @returns { heroes }
   */
  async getActiveHeroes() {
    const heroes = await this.db.hero.findMany({
      where: { isDraft: false, isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    // 각 히어로에 파일 정보 포함
    const heroesWithFiles = await Promise.all(
      heroes.map(async (hero) => {
        const files = await this.db.file.findMany({
          where: { targetId: hero.id, targetType: 'HERO' },
        });
        return { ...hero, files };
      }),
    );
    return ResponseBuilder.OK_WITH({ heroes: heroesWithFiles });
  }
}
