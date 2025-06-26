import { Injectable } from '@nestjs/common';
import { Company } from '@prisma/client';
import { DatabaseService } from '@app/database';
import { ResponseBuilder } from '@app/response';

/**
 * 회사 정보 서비스
 */
@Injectable()
export class CompanyService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 회사 최초 1회만 생성
   */
  async create(data: Partial<Company>) {
    const exists = await this.db.company.findFirst();
    if (exists) {
      return ResponseBuilder.Error(
        'Company already exists.',
        'COMPANY_ALREADY_EXISTS',
      );
    }
    const { id, ...createData } = data;
    if (!createData.name) {
      return ResponseBuilder.Error('Name is required.', 'NAME_REQUIRED');
    }
    const company = await this.db.company.create({
      data: { ...createData, name: createData.name },
    });
    return ResponseBuilder.OK_WITH({ company });
  }

  /**
   * 단일 회사 정보 반환 (공개)
   */
  async getCompany() {
    const company = await this.db.company.findFirst();
    if (!company) {
      return ResponseBuilder.Error('Company not found.', 'COMPANY_NOT_FOUND');
    }
    return ResponseBuilder.OK_WITH({ company });
  }

  /**
   * 회사 정보 수정 (관리자)
   */
  async update(data: Partial<Company>) {
    const company = await this.db.company.findFirst();
    if (!company) {
      return ResponseBuilder.Error('Company not found.', 'COMPANY_NOT_FOUND');
    }
    const updated = await this.db.company.update({
      where: { id: company.id },
      data,
    });
    return ResponseBuilder.OK_WITH({ company: updated });
  }
}
