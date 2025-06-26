import { PipeTransform } from '@nestjs/common';

export class MulterFilenamePipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    if (!file) {
      return file;
    }

    if (!/[^\u0000-\u00ff]/.test(file.originalname)) {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString(
        'utf8',
      );
    }
    file.originalname = file.originalname.replace(/\s/g, '');
    return file;
  }
}
