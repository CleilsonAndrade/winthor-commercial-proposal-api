import { Injectable } from '@nestjs/common';
import {
  COMMERCIAL_HOMOLOGATED_REGION_CODES_SQL,
  COMMERCIAL_UF_REGION_CODES_SQL,
} from '../constants/commercial-region.constants';
import { CatalogQuery } from '../interfaces/catalog-query.interface';
import { CatalogSearchCriteria } from '../interfaces/catalog-search-criteria.interface';
import { CatalogQueryFilterBuilder } from './catalog-query-filter.builder';

@Injectable()
export class CatalogQueryBuilder {
  constructor(private readonly filterBuilder: CatalogQueryFilterBuilder) {}

  build(criteria: CatalogSearchCriteria): CatalogQuery {
    const filters = this.filterBuilder.build(criteria);

    const productPredicates = filters.productPredicates
      .map((predicate) => `    AND ${predicate}`)
      .join('\n');

    const priceProductPredicate = filters.priceProductPredicate
      ? `      AND ${filters.priceProductPredicate}\n`
      : '';

    const sql = `SELECT
    P.DIRFOTOPROD AS PHOTO_PATH,
    P.CODPROD AS PRODUCT_CODE,
    P.DESCRICAO AS DESCRIPTION,
    P.QTUNIT AS MULTIPLE_QUANTITY,
    COALESCE(
      (
        SELECT MAX(W.QTUNIT)
        FROM PCWMSCODBARRAS W
        WHERE W.CODPRODUTO = P.CODPROD
          AND W.CODFILIAL = '4'
          AND W.QTUNIT > NVL(P.QTUNIT, 1)
          AND (
            NVL(P.QTUNITCX, 0) = 0
            OR W.QTUNIT < P.QTUNITCX
          )
      ),
      (
        SELECT MAX(E.QTUNIT)
        FROM PCEMBALAGEM E
        WHERE E.CODPROD = P.CODPROD
          AND NVL(E.EXCLUIDO, 'N') = 'N'
          AND E.QTUNIT > NVL(P.QTUNIT, 1)
          AND (
            NVL(P.QTUNITCX, 0) = 0
            OR E.QTUNIT < P.QTUNITCX
          )
      )
    ) AS INNER_BOX_QUANTITY,
    P.QTUNITCX AS MASTER_BOX_QUANTITY,
    NVL(P.PERCIPIVENDA, 0) AS IPI_PERCENT,
    ROUND(NVL(T.VLIPI, 0), 2) AS IPI_VALUE,
    NVL(TB.IVA, 0) AS MVA_PERCENT,
    ROUND(NVL(T.VLST, 0), 2) AS ST_VALUE,
    T.NUMREGIAO AS PRICE_REGION_CODE,
    RG.UF AS PRICE_STATE,
    RG.REGIAO AS PRICE_REGION_NAME,
      CASE
        WHEN T.NUMREGIAO IN (${COMMERCIAL_UF_REGION_CODES_SQL})
        THEN 'UF'
        ELSE 'ESPECIAL'
      END AS PRICE_REGION_TYPE,
    ROUND(T.PVENDASEMIMPOSTO1, 2) AS NET_PRICE,
    ROUND(
      T.PVENDASEMIMPOSTO1
      + NVL(T.VLIPI, 0)
      + NVL(T.VLST, 0),
      2
    ) AS GROSS_PRICE,
    :discountPercent AS DISCOUNT_PERCENT,
    ROUND(
      T.PVENDASEMIMPOSTO1
      * (1 - :discountPercent / 100),
      2
    ) AS DISCOUNTED_NET_PRICE,
    ROUND(
      (
        T.PVENDASEMIMPOSTO1
        + NVL(T.VLIPI, 0)
        + NVL(T.VLST, 0)
      )
      * (1 - :discountPercent / 100),
      2
    ) AS DISCOUNTED_GROSS_PRICE,
    PROM.DTINICIO AS PROMOTION_START,
    PROM.DTFIM AS PROMOTION_END,
    NVL(PROM.PERCDESC, 0) AS PROMOTION_PERCENT,
    PROM.QTINI AS PROMOTION_MIN_QUANTITY,
    ROUND(
      T.PVENDASEMIMPOSTO1
      * (1 - NVL(PROM.PERCDESC, 0) / 100),
      2
    ) AS PROMOTION_NET_PRICE,
    ROUND(
      (
        T.PVENDASEMIMPOSTO1
        + NVL(T.VLIPI, 0)
        + NVL(T.VLST, 0)
      )
      * (1 - NVL(PROM.PERCDESC, 0) / 100),
      2
    ) AS PROMOTION_GROSS_PRICE,
    CASE
      WHEN ROUND(NVL(T.PVENDASEMIMPOSTO1, 0), 2) = 0
      THEN 'SEM PRECO'
      WHEN NVL(PROM.QTPOLITICAS, 0) > 1
      THEN 'PROMO EM CONFLITO'
      ELSE ''
    END AS ALERT,
    GREATEST(
      NVL(EST.QTEST, 0)
      - NVL(EST.QTRESERV, 0)
      - NVL(EST.QTBLOQ, 0),
      0
    ) AS AVAILABLE_STOCK,
    NVL(MARC.MARCA, P.MARCA) AS BRAND,
    CASE
      WHEN UPPER(
        TRIM(
          NVL(MARC.MARCA, P.MARCA)
        )
      ) LIKE '%FL'
      THEN 'FORA DE LINHA'
      ELSE 'EM LINHA'
    END AS LINE_STATUS,
    SEC.CODEPTO AS DEPARTMENT_CODE,
    DEP.DESCRICAO AS DEPARTMENT_NAME,
    SEC.DESCRICAO AS SECTION_NAME,
    P.CLASSEVENDA AS SALES_CURVE,
    NVL(P.REVENDA, 'N') AS RESALE
FROM PCPRODUT P
JOIN (
  SELECT
    X.CODPROD,
    X.NUMREGIAO,
    X.CODST,
    X.PVENDASEMIMPOSTO1,
    X.VLIPI,
    X.VLST
  FROM (
    SELECT
      TP.CODPROD,
      TP.NUMREGIAO,
      TP.CODST,
      TP.PVENDASEMIMPOSTO1,
      TP.VLIPI,
      TP.VLST,
      ROW_NUMBER() OVER (
        PARTITION BY TP.CODPROD
        ORDER BY TP.PVENDASEMIMPOSTO1
      ) AS RN
    FROM PCTABPR TP
    WHERE NVL(TP.EXCLUIDO, 'N') = 'N'
${priceProductPredicate}      AND TP.NUMREGIAO IN (
        SELECT PR.NUMREGIAO
        FROM PCPRACA PR
        JOIN PCREGIAO R
          ON R.NUMREGIAO = PR.NUMREGIAO
        WHERE ${filters.priceRegionPredicate}
          AND NVL(PR.SITUACAO, 'A') <> 'I'
          AND UPPER(TRIM(PR.PRACA)) NOT LIKE 'INAT%'
          AND R.STATUS = 'A'
          AND R.NUMREGIAO IN (${COMMERCIAL_HOMOLOGATED_REGION_CODES_SQL})
      )
  ) X
  WHERE X.RN = 1
) T
  ON T.CODPROD = P.CODPROD
LEFT JOIN PCREGIAO RG
  ON RG.NUMREGIAO = T.NUMREGIAO
LEFT JOIN PCTRIBUT TB
  ON TB.CODST = T.CODST
LEFT JOIN (
  SELECT
    CODPROD,
    SUM(QTEST) AS QTEST,
    SUM(QTRESERV) AS QTRESERV,
    SUM(QTBLOQUEADA) AS QTBLOQ
  FROM PCEST
  WHERE CODFILIAL = '4'
  GROUP BY CODPROD
) EST
  ON EST.CODPROD = P.CODPROD
LEFT JOIN (
  SELECT
    D.CODPROD,
    MIN(D.PERCDESC) AS PERCDESC,
    MIN(D.DTINICIO) AS DTINICIO,
    MAX(D.DTFIM) AS DTFIM,
    MIN(D.QTINI) AS QTINI,
    COUNT(*) AS QTPOLITICAS
  FROM PCDESCONTO D
  WHERE D.APLICADESCONTO = 'S'
    AND D.CODPROD IS NOT NULL
    AND NVL(D.QTINI, 0) > 0
    AND D.DTFIM - D.DTINICIO <= 365
    AND TRUNC(SYSDATE)
      BETWEEN TRUNC(D.DTINICIO)
      AND TRUNC(D.DTFIM)
  GROUP BY D.CODPROD
) PROM
  ON PROM.CODPROD = P.CODPROD
LEFT JOIN PCSECAO SEC
  ON SEC.CODSEC = P.CODSEC
LEFT JOIN PCDEPTO DEP
  ON DEP.CODEPTO = SEC.CODEPTO
LEFT JOIN PCMARCA MARC
  ON MARC.CODMARCA = P.CODMARCA
WHERE P.DTEXCLUSAO IS NULL
${productPredicates}
ORDER BY
  DEP.DESCRICAO,
  SEC.DESCRICAO,
  P.DESCRICAO`;

    return {
      sql,
      binds: filters.binds,
    };
  }
}
