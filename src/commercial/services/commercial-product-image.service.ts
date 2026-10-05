import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, type ReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, extname, resolve, sep } from 'node:path';
import { OracleService } from '../../infrastructure/oracle/oracle.service';

interface ProductImageRow {
  PHOTO_PATH: string | null;
}

export interface CommercialProductImageFile {
  stream: ReadStream;
  contentType: string;
  fileName: string;
}

@Injectable()
export class CommercialProductImageService {
  constructor(
    private readonly oracleService: OracleService,
    private readonly configService: ConfigService,
  ) {}

  async get(productCode: number): Promise<CommercialProductImageFile> {
    const rows = await this.oracleService.query<ProductImageRow>(
      `SELECT
         DIRFOTOPROD AS PHOTO_PATH
       FROM PCPRODUT
       WHERE CODPROD = :productCode
         AND DTEXCLUSAO IS NULL`,
      {
        productCode,
      },
    );

    const row = rows[0];

    if (!row || !row.PHOTO_PATH?.trim()) {
      throw this.notFound();
    }

    const filePath = this.resolveLocalPath(row.PHOTO_PATH);

    if (!filePath) {
      throw this.notFound();
    }

    const contentType = this.resolveContentType(filePath);

    if (!contentType) {
      throw this.notFound();
    }

    try {
      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) {
        throw this.notFound();
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw this.notFound();
    }

    return {
      stream: createReadStream(filePath),
      contentType,
      fileName: basename(filePath),
    };
  }

  private resolveLocalPath(photoPath: string): string | null {
    const match = /^\\\\[^\\]+\\WINTHOR\\IMG\\(.+)$/i.exec(photoPath.trim());

    if (!match) {
      return null;
    }

    const relativeWindowsPath = match[1];

    const segments = relativeWindowsPath.split('\\');

    if (
      segments.length === 0 ||
      segments.some(
        (segment) =>
          segment.length === 0 ||
          segment === '.' ||
          segment === '..' ||
          segment.includes('/') ||
          segment.includes('\0'),
      )
    ) {
      return null;
    }

    const imageRoot = resolve(
      this.configService.getOrThrow<string>('WINTHOR_IMAGE_ROOT'),
    );

    const filePath = resolve(imageRoot, ...segments);

    if (!filePath.startsWith(`${imageRoot}${sep}`)) {
      return null;
    }

    return filePath;
  }

  private resolveContentType(filePath: string): string | null {
    switch (extname(filePath).toLowerCase()) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';

      case '.png':
        return 'image/png';

      case '.webp':
        return 'image/webp';

      case '.gif':
        return 'image/gif';

      case '.bmp':
        return 'image/bmp';

      default:
        return null;
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException('Imagem do produto não disponível');
  }
}
