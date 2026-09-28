import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import oracledb, { type Pool } from 'oracledb';

interface OracleHealthRow {
  TESTE: number;
  BANCO: string;
  USUARIO: string;
}

export interface OracleHealthResult {
  status: 'ok';
  driverVersion: string;
  driverMode: 'thin' | 'thick';
  database: string;
  user: string;
  test: number;
}

@Injectable()
export class OracleService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(OracleService.name);
  private pool?: Pool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.getOrThrow<string>('DB_HOST');
    const portValue = this.configService.get<string>('DB_PORT') ?? '1521';
    const username = this.configService.getOrThrow<string>('DB_USERNAME');
    const password = this.configService.getOrThrow<string>('DB_PASSWORD');
    const serviceName =
      this.configService.getOrThrow<string>('DB_SERVICE_NAME');

    const port = Number(portValue);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`DB_PORT inválida: ${portValue}`);
    }

    const connectString = `${host}:${port}/${serviceName}`;

    this.pool = await oracledb.createPool({
      user: username,
      password,
      connectString,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
    });

    this.logger.log(
      `Pool Oracle iniciado em ${host}:${port}/${serviceName} ` +
        `(${oracledb.thin ? 'Thin' : 'Thick'})`,
    );
  }

  async health(): Promise<OracleHealthResult> {
    const pool = this.getPool();
    const connection = await pool.getConnection();

    try {
      const result = await connection.execute(
        `SELECT
           1 AS TESTE,
           SYS_CONTEXT('USERENV', 'DB_NAME') AS BANCO,
           SYS_CONTEXT('USERENV', 'SESSION_USER') AS USUARIO
         FROM DUAL`,
        [],
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        },
      );

      const rows = result.rows as OracleHealthRow[] | undefined;
      const row = rows?.[0];

      if (!row) {
        throw new Error('Oracle não retornou resultado no health check');
      }

      return {
        status: 'ok',
        driverVersion: oracledb.versionString,
        driverMode: oracledb.thin ? 'thin' : 'thick',
        database: row.BANCO,
        user: row.USUARIO,
        test: row.TESTE,
      };
    } finally {
      await connection.close();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.close(10);
    this.pool = undefined;

    this.logger.log('Pool Oracle encerrado');
  }

  private getPool(): Pool {
    if (!this.pool) {
      throw new Error('Pool Oracle não inicializado');
    }

    return this.pool;
  }
}
