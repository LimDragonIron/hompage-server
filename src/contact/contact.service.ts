import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { ResponseBuilder } from '@app/response';
import { CreateContactDto } from './dto';

/**
 * 문의(Contact) 비즈니스 로직 서비스
 */
@Injectable()
export class ContactService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 문의 등록 (누구나)
   * @param data 문의 생성 DTO
   * @returns 생성된 문의 데이터
   */
  async create(data: CreateContactDto) {
    const contact = await this.db.contact.create({ data });
    return ResponseBuilder.OK_WITH({ contact });
  }

  /**
   * 문의 전체 리스트 조회 (관리자)
   * @returns 문의 리스트
   */
  async findAll() {
    const contactList = await this.db.contact.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return ResponseBuilder.OK_WITH({ contactList });
  }

  /**
   * 문의 상세 조회 (관리자)
   * @param id 문의 고유 ID
   * @returns 문의 상세 데이터
   */
  async findOne(id: number) {
    const contact = await this.db.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('문의 내역을 찾을 수 없습니다.');
    return ResponseBuilder.OK_WITH({ contact });
  }
}
