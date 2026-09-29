import { Injectable } from '@nestjs/common';
import { OracleService } from '../../infrastructure/oracle/oracle.service';
import { DepartmentOption } from '../interfaces/department-option.interface';
import { PlazaOption } from '../interfaces/plaza-option.interface';

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

@Injectable()
export class CommercialFilterService {
  constructor(private readonly oracleService: OracleService) {}

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

  async findPlazas(search?: string): Promise<PlazaOption[]> {
    const normalizedSearch = search?.trim() || null;

    const rows = await this.oracleService.query<PlazaRow>(
      `SELECT
         PR.CODPRACA AS CODE,
         PR.PRACA AS NAME,
         R.NUMREGIAO AS REGION_CODE,
         R.UF AS STATE,
         CASE
           WHEN R.NUMREGIAO IN (
             300,302,308,310,314,321,324,327,
             328,330,334,336,338,340,342,344,
             346,348,350,352,355,357,362,367,
             368,370,372
           )
           THEN 'UF'
           ELSE 'ESPECIAL'
         END AS TYPE
       FROM PCPRACA PR
       JOIN PCREGIAO R
         ON R.NUMREGIAO = PR.NUMREGIAO
       WHERE NVL(PR.SITUACAO, 'A') <> 'I'
         AND UPPER(TRIM(PR.PRACA)) NOT LIKE 'INAT%'
         AND R.STATUS = 'A'
         AND R.NUMREGIAO IN (
           300,302,308,310,314,321,324,327,
           328,330,332,334,336,338,340,342,
           344,346,348,350,352,355,357,362,
           367,368,370,372,376,377,381,382,
           383,480,481,1000
         )
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
