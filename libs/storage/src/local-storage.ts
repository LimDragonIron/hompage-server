import { StorageAdapter } from './storage.adapter';
import { Injectable, Logger } from '@nestjs/common';
import { join, resolve } from 'path';
import * as process from 'process';
import * as fse from 'fs-extra';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { StorageFile } from '@app/types';

@Injectable()
export class LocalStorage extends StorageAdapter {
  protected readonly logger = new Logger(LocalStorage.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async upload(
    { originalName, buffer }: StorageFile,
    generateFileName: (fileName: string) => string,
  ): Promise<string> {
    const root = this.config.get<string>('storage.root') || 'uploads';
    const uploadDir = resolve(process.cwd(), root);
    await fse.ensureDir(uploadDir);

    const fileName = generateFileName(originalName);
    const relativePath = join(root, fileName);
    const absolutePath = resolve(process.cwd(), relativePath);

    await fse.writeFile(absolutePath, buffer);

    this.logger.log(
      `File was uploaded successfully. File path is ${relativePath}`,
    );

    // DB에는 /uploads/파일명 형태로 저장하는 게 일반적입니다.
    // 만약 root가 uploads라면 /uploads/파일명으로 반환
    return relativePath.startsWith('uploads')
      ? '/' + relativePath.replace(/\\/g, '/')
      : '/' + relativePath.replace(/\\/g, '/');
  }

  async download(path: string): Promise<Buffer> {
    this.logger.log('Local storage download...');
    const absolutePath = resolve(
      process.cwd(),
      path.startsWith('/') ? path.slice(1) : path,
    );
    return await fs.readFile(absolutePath);
  }

  async removeFile(path: string): Promise<void> {
    this.logger.log('in remove');
    const absolutePath = resolve(
      process.cwd(),
      path.startsWith('/') ? path.slice(1) : path,
    );
    this.logger.log(`Attempting to remove file: ${absolutePath}`);

    try {
      await fs.access(absolutePath, fs.constants.F_OK);
      await fs.unlink(absolutePath);
      this.logger.log(`File removed successfully: ${absolutePath}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`File not found, skipping removal: ${absolutePath}`);
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        this.logger.error(
          `Permission denied to remove file: ${absolutePath}`,
          error.stack,
        );
        throw error;
      } else {
        this.logger.error(
          `Failed to remove file: ${absolutePath}`,
          error.stack,
        );
        throw error;
      }
    }
  }
}
