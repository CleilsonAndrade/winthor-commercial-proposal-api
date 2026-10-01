import { Injectable } from '@nestjs/common';
import { buildOracleInList } from '../../infrastructure/oracle/oracle-in-list.builder';
import { CatalogSearchCriteria } from '../interfaces/catalog-search-criteria.interface';
import { CatalogQueryFilters } from '../interfaces/catalog-query-filters.interface';

@Injectable()
export class CatalogQueryFilterBuilder {
  build(criteria: CatalogSearchCriteria): CatalogQueryFilters {
    const productPredicates: string[] = [];
    const binds: CatalogQueryFilters['binds'] = {};

    const plazas = buildOracleInList('plaza', criteria.plazaCodes);

    if (!plazas) {
      throw new Error(
        'Ao menos uma praça é obrigatória para consultar o catálogo.',
      );
    }

    const priceRegionPredicate = `PR.CODPRACA IN (${plazas.placeholders})`;

    Object.assign(binds, plazas.binds);

    const products = buildOracleInList(
      'product',
      criteria.productCodes ?? null,
    );

    const priceProductPredicate = products
      ? `TP.CODPROD IN (${products.placeholders})`
      : null;

    if (products) {
      Object.assign(binds, products.binds);
    }

    this.addOptionalInList(
      productPredicates,
      binds,
      'SEC.CODEPTO',
      'department',
      criteria.departmentCodes,
    );

    this.addOptionalInList(
      productPredicates,
      binds,
      'P.CODSEC',
      'section',
      criteria.sectionCodes,
    );

    if (criteria.resale !== null) {
      productPredicates.push("NVL(P.REVENDA, 'N') = :resale");

      binds.resale = criteria.resale;
    }

    productPredicates.push(
      `ROUND(
        (
          NVL(T.PVENDASEMIMPOSTO1, 0)
          + NVL(T.VLIPI, 0)
          + NVL(T.VLST, 0)
        )
        * (1 - :discountPercent / 100),
        2
      ) <= :maxFinalPrice`,
    );

    binds.discountPercent = criteria.discountPercent;
    binds.maxFinalPrice = criteria.maxFinalPrice;

    if (criteria.pricePresence !== 'T') {
      productPredicates.push(
        criteria.pricePresence === 'S'
          ? 'ROUND(NVL(T.PVENDASEMIMPOSTO1, 0), 2) > 0'
          : 'ROUND(NVL(T.PVENDASEMIMPOSTO1, 0), 2) = 0',
      );
    }

    productPredicates.push(
      `GREATEST(
        NVL(EST.QTEST, 0)
        - NVL(EST.QTRESERV, 0)
        - NVL(EST.QTBLOQ, 0),
        0
      ) >= :minStock`,
    );

    binds.minStock = criteria.minStock;

    if (criteria.innerBoxPresence !== 'T') {
      productPredicates.push(
        `CASE
          WHEN COALESCE(
            (
              SELECT MAX(W2.QTUNIT)
              FROM PCWMSCODBARRAS W2
              WHERE W2.CODPRODUTO = P.CODPROD
                AND W2.CODFILIAL = '4'
                AND W2.QTUNIT > NVL(P.QTUNIT, 1)
                AND (
                  NVL(P.QTUNITCX, 0) = 0
                  OR W2.QTUNIT < P.QTUNITCX
                )
            ),
            (
              SELECT MAX(E2.QTUNIT)
              FROM PCEMBALAGEM E2
              WHERE E2.CODPROD = P.CODPROD
                AND NVL(E2.EXCLUIDO, 'N') = 'N'
                AND E2.QTUNIT > NVL(P.QTUNIT, 1)
                AND (
                  NVL(P.QTUNITCX, 0) = 0
                  OR E2.QTUNIT < P.QTUNITCX
                )
            )
          ) IS NOT NULL
          THEN 'S'
          ELSE 'N'
        END = :innerBoxPresence`,
      );

      binds.innerBoxPresence = criteria.innerBoxPresence;
    }

    this.addPurchaseHistoryFilter(productPredicates, binds, criteria);

    return {
      priceRegionPredicate,
      priceProductPredicate,
      productPredicates,
      binds,
    };
  }

  private addOptionalInList(
    predicates: string[],
    binds: CatalogQueryFilters['binds'],
    column: string,
    prefix: string,
    values: readonly number[] | null,
  ): void {
    const list = buildOracleInList(prefix, values);

    if (!list) {
      return;
    }

    predicates.push(`${column} IN (${list.placeholders})`);

    Object.assign(binds, list.binds);
  }

  private addPurchaseHistoryFilter(
    predicates: string[],
    binds: CatalogQueryFilters['binds'],
    criteria: CatalogSearchCriteria,
  ): void {
    const parentClients = buildOracleInList(
      'parentClient',
      criteria.parentClientCodes,
    );

    const clients = buildOracleInList('client', criteria.clientCodes);

    if (!parentClients && !clients) {
      return;
    }

    binds.purchaseMonths = criteria.purchaseMonths;

    if (parentClients) {
      predicates.push(
        `P.CODPROD IN (
          SELECT I.CODPROD
          FROM PCPEDI I
          JOIN PCPEDC C
            ON C.NUMPED = I.NUMPED
          JOIN PCCLIENT CL
            ON CL.CODCLI = C.CODCLI
          WHERE NVL(CL.CODCLIPRINC, CL.CODCLI)
            IN (${parentClients.placeholders})
            AND C.DATA >= ADD_MONTHS(
              TRUNC(SYSDATE),
              -1 * :purchaseMonths
            )
        )`,
      );

      Object.assign(binds, parentClients.binds);
    }

    if (clients) {
      predicates.push(
        `P.CODPROD IN (
          SELECT I.CODPROD
          FROM PCPEDI I
          JOIN PCPEDC C
            ON C.NUMPED = I.NUMPED
          WHERE C.CODCLI IN (${clients.placeholders})
            AND C.DATA >= ADD_MONTHS(
              TRUNC(SYSDATE),
              -1 * :purchaseMonths
            )
        )`,
      );

      Object.assign(binds, clients.binds);
    }
  }
}
