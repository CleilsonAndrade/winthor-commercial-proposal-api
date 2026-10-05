import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OracleService } from '../../infrastructure/oracle/oracle.service';
import { CommercialProductImageService } from './commercial-product-image.service';

describe('CommercialProductImageService', () => {
  let imageRoot: string;
  let query: jest.Mock;
  let service: CommercialProductImageService;

  beforeEach(async () => {
    imageRoot = await mkdtemp(join(tmpdir(), 'commercial-product-image-'));

    await mkdir(join(imageRoot, 'UD_BQ'), {
      recursive: true,
    });

    await writeFile(
      join(imageRoot, 'UD_BQ', 'AD21F1.jpg'),
      Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    );

    query = jest.fn();

    const oracleService = {
      query,
    } as unknown as OracleService;

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'WINTHOR_IMAGE_ROOT') {
          return imageRoot;
        }

        throw new Error(`Configuração inesperada: ${key}`);
      }),
    } as unknown as ConfigService;

    service = new CommercialProductImageService(oracleService, configService);
  });

  afterEach(async () => {
    await rm(imageRoot, {
      recursive: true,
      force: true,
    });
  });

  it('resolve e abre a foto cadastrada do produto', async () => {
    query.mockResolvedValue([
      {
        PHOTO_PATH: '\\\\10.122.175.3\\WINTHOR\\IMG\\UD_BQ\\AD21F1.jpg',
      },
    ]);

    const result = await service.get(7624);

    expect(result.contentType).toBe('image/jpeg');
    expect(result.fileName).toBe('AD21F1.jpg');

    result.stream.destroy();

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM PCPRODUT'),
      {
        productCode: 7624,
      },
    );
  });

  it('retorna 404 para produto inexistente', async () => {
    query.mockResolvedValue([]);

    await expect(service.get(999999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retorna 404 para produto sem foto cadastrada', async () => {
    query.mockResolvedValue([
      {
        PHOTO_PATH: null,
      },
    ]);

    await expect(service.get(7624)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita caminho fora do compartilhamento permitido', async () => {
    query.mockResolvedValue([
      {
        PHOTO_PATH: '\\\\10.122.175.3\\OUTRO\\IMG\\UD_BQ\\AD21F1.jpg',
      },
    ]);

    await expect(service.get(7624)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita tentativa de escapar da raiz de imagens', async () => {
    query.mockResolvedValue([
      {
        PHOTO_PATH: '\\\\10.122.175.3\\WINTHOR\\IMG\\..\\segredo.jpg',
      },
    ]);

    await expect(service.get(7624)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retorna 404 quando o caminho existe no banco mas o arquivo não existe', async () => {
    query.mockResolvedValue([
      {
        PHOTO_PATH: '\\\\10.122.175.3\\WINTHOR\\IMG\\UD_BQ\\INEXISTENTE.jpg',
      },
    ]);

    await expect(service.get(7624)).rejects.toBeInstanceOf(NotFoundException);
  });
});
