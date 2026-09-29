import { BadRequestException, Injectable } from '@nestjs/common';
import { OracleService } from '../../infrastructure/oracle/oracle.service';
import {
  COMMERCIAL_HOMOLOGATED_REGION_CODES_SQL,
  COMMERCIAL_UF_REGION_CODES_SQL,
} from '../constants/commercial-region.constants';
import { ClientOption } from '../interfaces/client-option.interface';
import { DepartmentOption } from '../interfaces/department-option.interface';
import { ParentClientOption } from '../interfaces/parent-client-option.interface';
import { PlazaOption } from '../interfaces/plaza-option.interface';
import { SectionOption } from '../interfaces/section-option.interface';

interface PlazaRow {
  CODE: number;
  NAME: string;
  REGION_CODE: number;
  STATE: string;
  TYPE: 'UF' | 'ESPECIAL';
}

interface DepartmentRow {
  CODE: number;
  NAME: string;
  STATUS: 'ATIVO' | 'INATIVO';
  SECTION_COUNT: number;
}

interface SectionRow {
  CODE: number;
  NAME: string;
  DEPARTMENT_CODE: number | null;
  DEPARTMENT_NAME: string | null;
}

interface ParentClientRow {
  CODE: number;
  NAME: string;
  TRADE_NAME: string | null;
  DOCUMENT: string | null;
  STORE_COUNT: number;
}

interface ClientRow {
  CODE: number;
  NAME: string;
  TRADE_NAME: string | null;
  DOCUMENT: string | null;
  CITY: string | null;
  BLOCKED: string | null;
  NETWORK_CODE: number;
}

@Injectable()
export class CommercialFilterService {
  constructor(private readonly oracleService: OracleService) {}

  async findClients(
    search?: string,
    documentPrefix?: string,
  ): Promise<ClientOption[]> {
    const normalizedSearch = search?.trim() || null;
    const normalizedDocumentPrefix = documentPrefix?.trim() || null;

    if (!normalizedSearch && !normalizedDocumentPrefix) {
      throw new BadRequestException(
        'Informe o nome ou o prefixo do documento para pesquisar clientes.',
      );
    }

    const rows = await this.oracleService.query<ClientRow>(
      `SELECT
         C.CODCLI AS CODE,
         C.CLIENTE AS NAME,
         C.FANTASIA AS TRADE_NAME,
         C.CGCENT AS DOCUMENT,
         C.MUNICENT AS CITY,
         C.BLOQUEIO AS BLOCKED,
         NVL(C.CODCLIPRINC, C.CODCLI) AS NETWORK_CODE
       FROM PCCLIENT C
       WHERE C.DTEXCLUSAO IS NULL
         AND (
           :search IS NULL
           OR UPPER(NVL(C.CLIENTE, '-'))
             LIKE '%' || UPPER(:search) || '%'
         )
         AND (
           :documentPrefix IS NULL
           OR NVL(C.CGCENT, '-')
             LIKE :documentPrefix || '%'
         )
       ORDER BY
         C.CLIENTE,
         C.CODCLI`,
      {
        search: normalizedSearch,
        documentPrefix: normalizedDocumentPrefix,
      },
    );

    return rows.map((row) => ({
      code: row.CODE,
      name: row.NAME,
      tradeName: row.TRADE_NAME,
      document: row.DOCUMENT,
      city: row.CITY,
      blocked: row.BLOCKED,
      networkCode: row.NETWORK_CODE,
    }));
  }

  async findDepartments(search?: string): Promise<DepartmentOption[]> {
    const normalizedSearch = search?.trim() || null;

    const rows = await this.oracleService.query<DepartmentRow>(
      `SELECT
         D.CODEPTO AS CODE,
         D.DESCRICAO AS NAME,
         CASE
           WHEN UPPER(TRIM(D.DESCRICAO)) LIKE 'INAT%'
           THEN 'INATIVO'
           ELSE 'ATIVO'
         END AS STATUS,
         (
           SELECT COUNT(*)
           FROM PCSECAO S
           WHERE S.CODEPTO = D.CODEPTO
             AND S.DTEXCLUSAO IS NULL
         ) AS SECTION_COUNT
       FROM PCDEPTO D
       WHERE (
         :search IS NULL
         OR UPPER(D.DESCRICAO) LIKE '%' || UPPER(:search) || '%'
       )
       ORDER BY
         CASE
           WHEN UPPER(TRIM(D.DESCRICAO)) LIKE 'INAT%'
           THEN 1
           ELSE 0
         END,
         D.DESCRICAO`,
      {
        search: normalizedSearch,
      },
    );

    return rows.map((row) => ({
      code: row.CODE,
      name: row.NAME,
      status: row.STATUS,
      sectionCount: row.SECTION_COUNT,
    }));
  }

  async findSections(search?: string): Promise<SectionOption[]> {
    const normalizedSearch = search?.trim() || null;

    const rows = await this.oracleService.query<SectionRow>(
      `SELECT
         SEC.CODSEC AS CODE,
         SEC.DESCRICAO AS NAME,
         SEC.CODEPTO AS DEPARTMENT_CODE,
         DEP.DESCRICAO AS DEPARTMENT_NAME
       FROM PCSECAO SEC
       LEFT JOIN PCDEPTO DEP
         ON DEP.CODEPTO = SEC.CODEPTO
       WHERE SEC.DTEXCLUSAO IS NULL
         AND (
           :search IS NULL
           OR UPPER(SEC.DESCRICAO) LIKE '%' || UPPER(:search) || '%'
         )
       ORDER BY
         DEP.DESCRICAO,
         SEC.DESCRICAO`,
      {
        search: normalizedSearch,
      },
    );

    return rows.map((row) => ({
      code: row.CODE,
      name: row.NAME,
      departmentCode: row.DEPARTMENT_CODE,
      departmentName: row.DEPARTMENT_NAME,
    }));
  }

  async findParentClients(search?: string): Promise<ParentClientOption[]> {
    const normalizedSearch = search?.trim() || null;

    const rows = await this.oracleService.query<ParentClientRow>(
      `WITH NETWORK AS (
         SELECT
           NVL(F.CODCLIPRINC, F.CODCLI) AS PARENT_CODE,
           COUNT(*) AS STORE_COUNT,
           SUM(
             CASE
               WHEN F.CODCLI <> NVL(F.CODCLIPRINC, F.CODCLI)
               THEN 1
               ELSE 0
             END
           ) AS CHILD_COUNT
         FROM PCCLIENT F
         WHERE F.DTEXCLUSAO IS NULL
         GROUP BY NVL(F.CODCLIPRINC, F.CODCLI)
       )
       SELECT
         CL.CODCLI AS CODE,
         CL.CLIENTE AS NAME,
         CL.FANTASIA AS TRADE_NAME,
         CL.CGCENT AS DOCUMENT,
         N.STORE_COUNT
       FROM PCCLIENT CL
       JOIN NETWORK N
         ON N.PARENT_CODE = CL.CODCLI
        AND N.CHILD_COUNT > 0
       WHERE CL.DTEXCLUSAO IS NULL
         AND (
           :search IS NULL
           OR UPPER(NVL(CL.CLIENTE, '-'))
             LIKE '%' || UPPER(:search) || '%'
         )
       ORDER BY
         CL.CLIENTE,
         CL.CODCLI`,
      {
        search: normalizedSearch,
      },
    );

    return rows.map((row) => ({
      code: row.CODE,
      name: row.NAME,
      tradeName: row.TRADE_NAME,
      document: row.DOCUMENT,
      storeCount: row.STORE_COUNT,
    }));
  }

  async findPlazas(search?: string): Promise<PlazaOption[]> {
    const normalizedSearch = search?.trim() || null;

    const rows = await this.oracleService.query<PlazaRow>(
      `SELECT
         PR.CODPRACA AS CODE,
         PR.PRACA AS NAME,
         R.NUMREGIAO AS REGION_CODE,
         R.UF AS STATE,
         CASE
           WHEN R.NUMREGIAO IN (${COMMERCIAL_UF_REGION_CODES_SQL})
           THEN 'UF'
           ELSE 'ESPECIAL'
         END AS TYPE
       FROM PCPRACA PR
       JOIN PCREGIAO R
         ON R.NUMREGIAO = PR.NUMREGIAO
       WHERE NVL(PR.SITUACAO, 'A') <> 'I'
         AND UPPER(TRIM(PR.PRACA)) NOT LIKE 'INAT%'
         AND R.STATUS = 'A'
         AND R.NUMREGIAO IN (${COMMERCIAL_HOMOLOGATED_REGION_CODES_SQL})
         AND (
           :search IS NULL
           OR UPPER(PR.PRACA) LIKE '%' || UPPER(:search) || '%'
         )
       ORDER BY
         CASE
           WHEN R.NUMREGIAO IN (
             300,302,308,310,314,321,324,327,
             328,330,334,336,338,340,342,344,
             346,348,350,352,355,357,362,367,
             368,370,372
           )
           THEN 0
           ELSE 1
         END,
         R.UF,
         PR.PRACA`,
      {
        search: normalizedSearch,
      },
    );

    return rows.map((row) => ({
      code: row.CODE,
      name: row.NAME,
      regionCode: row.REGION_CODE,
      state: row.STATE,
      type: row.TYPE,
    }));
  }
}
