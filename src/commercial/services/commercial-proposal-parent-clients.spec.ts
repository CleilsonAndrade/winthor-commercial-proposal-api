import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OracleService } from '../../infrastructure/oracle/oracle.service';
import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import type { PreQuotePreview } from '../interfaces/pre-quote-preview.interface';
import { CommercialFilterService } from './commercial-filter.service';
import { CommercialPreQuoteService } from './commercial-pre-quote.service';
import { CommercialProposalPreviewService } from './commercial-proposal-preview.service';

describe('Proposta comercial - Cliente Pai / Rede', () => {
  const network = {
    code: 35826,
    name: 'REDE COMERCIAL EXEMPLO',
    tradeName: 'GRUPO EXEMPLO',
    document: '00123456000178',
    storeCount: 4,
  };

  const secondNetwork = {
    code: 36491,
    name: 'SEGUNDA REDE EXEMPLO',
    tradeName: null,
    document: null,
    storeCount: 2,
  };

  function input(parentClientCodes?: number[]): PreQuoteCalculateDto {
    return plainToInstance(PreQuoteCalculateDto, {
      plazaCodes: [468],
      discountPercent: 0,
      items: [{ productCode: 7624, quantity: 1 }],
      ...(parentClientCodes ? { parentClientCodes } : {}),
    });
  }

  function subject() {
    const calculate = jest.fn().mockResolvedValue({
      context: {
        plazaCodes: [468],
        discountPercent: 0,
      },
      items: [],
      summary: {
        itemCount: 0,
        totalQuantity: 0,
        regular: { net: 0, gross: 0 },
        discount: { net: 0, gross: 0 },
        pricingStatus: {
          itemsWithoutPrice: 0,
          promotionAvailableItems: 0,
          promotionEligibleItems: 0,
          promotionIneligibleItems: 0,
          allItemsPriced: true,
          hasPromotionAvailable: false,
          hasPromotionEligible: false,
          hasPromotionPendingQuantity: false,
        },
      },
    } satisfies PreQuotePreview);

    const findParentClientsByCodes = jest
      .fn()
      .mockResolvedValue([network, secondNetwork]);

    const findClientByCode = jest.fn().mockResolvedValue({
      code: 2219,
      name: 'CLIENTE DESTINATARIO',
      tradeName: null,
      document: null,
      city: null,
      blocked: null,
      networkCode: 2219,
    });

    const service = new CommercialProposalPreviewService(
      { calculate } as unknown as CommercialPreQuoteService,
      {
        findParentClientsByCodes,
        findClientByCode,
      } as unknown as CommercialFilterService,
    );

    return {
      service,
      calculate,
      findParentClientsByCodes,
      findClientByCode,
    };
  }

  it('mantém o contrato anterior sem redes selecionadas', async () => {
    const { service, calculate, findParentClientsByCodes } = subject();
    const request = input();

    const result = await service.preview(request);

    expect(result.context).toEqual({
      plazaCodes: [468],
      discountPercent: 0,
    });

    expect(findParentClientsByCodes).not.toHaveBeenCalled();
    expect(calculate).toHaveBeenCalledWith(request);
  });

  it('inclui múltiplas redes na prévia sem alterar o cálculo', async () => {
    const { service, calculate, findParentClientsByCodes } = subject();
    const request = input([35826, 36491]);

    const result = await service.preview(request);

    expect(findParentClientsByCodes).toHaveBeenCalledWith([35826, 36491]);
    expect(result.context.parentClients).toEqual([network, secondNetwork]);
    expect(calculate).toHaveBeenCalledWith(request);
  });

  it('permite redes e destinatário simultaneamente', async () => {
    const { service } = subject();

    const result = await service.preview(
      Object.assign(input([35826]), { clientCode: 2219 }),
    );

    expect(result.context.parentClients).toEqual([network, secondNetwork]);
    expect(result.context.recipient?.code).toBe(2219);
  });

  it('rejeita rede não localizada antes do cálculo', async () => {
    const { service, calculate, findParentClientsByCodes } = subject();

    findParentClientsByCodes.mockResolvedValue([network]);

    await expect(service.preview(input([35826, 999999]))).rejects.toThrow(
      '999999',
    );

    expect(calculate).not.toHaveBeenCalled();
  });

  it.each([[0], [-1], [1.5]])(
    'rejeita código inválido de rede: %s',
    async (code) => {
      const errors = await validate(input([code]));

      expect(errors.map((error) => error.property)).toContain(
        'parentClientCodes',
      );
    },
  );

  it('rejeita redes duplicadas e lista vazia', async () => {
    for (const codes of [[35826, 35826], []]) {
      const errors = await validate(input(codes));

      expect(errors.map((error) => error.property)).toContain(
        'parentClientCodes',
      );
    }
  });

  it('consulta redes por códigos com binds Oracle', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        CODE: secondNetwork.code,
        NAME: secondNetwork.name,
        TRADE_NAME: secondNetwork.tradeName,
        DOCUMENT: secondNetwork.document,
        STORE_COUNT: secondNetwork.storeCount,
      },
      {
        CODE: network.code,
        NAME: network.name,
        TRADE_NAME: network.tradeName,
        DOCUMENT: network.document,
        STORE_COUNT: network.storeCount,
      },
    ]);

    const filterService = new CommercialFilterService({
      query,
    } as unknown as OracleService);

    const result = await filterService.findParentClientsByCodes([35826, 36491]);

    expect(result).toEqual([network, secondNetwork]);

    const [sql, binds] = query.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(sql).toContain('N.CHILD_COUNT > 0');
    expect(sql).toContain('CL.DTEXCLUSAO IS NULL');
    expect(sql).toContain('CL.CODCLI IN (:parentCode0, :parentCode1)');

    expect(binds).toEqual({
      parentCode0: 35826,
      parentCode1: 36491,
    });
  });

  it('não consulta Oracle sem códigos', async () => {
    const query = jest.fn();

    const filterService = new CommercialFilterService({
      query,
    } as unknown as OracleService);

    await expect(filterService.findParentClientsByCodes([])).resolves.toEqual(
      [],
    );

    expect(query).not.toHaveBeenCalled();
  });
});
