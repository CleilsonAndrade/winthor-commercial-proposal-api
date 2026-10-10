import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OracleService } from '../../infrastructure/oracle/oracle.service';
import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import type { PreQuotePreview } from '../interfaces/pre-quote-preview.interface';
import { CommercialFilterService } from './commercial-filter.service';
import { CommercialPreQuoteService } from './commercial-pre-quote.service';
import { CommercialProposalPreviewService } from './commercial-proposal-preview.service';

describe('Proposta comercial - destinatário', () => {
  const client = {
    code: 35827,
    name: 'CLIENTE TESTE LTDA',
    tradeName: 'LOJA TESTE',
    document: '12345678000100',
    city: 'SAO PAULO',
    blocked: 'N',
    networkCode: 35826,
  };

  const preQuote: PreQuotePreview = {
    context: {
      plazaCodes: [468],
      discountPercent: 10,
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
  };

  function createInput(clientCode?: number): PreQuoteCalculateDto {
    return plainToInstance(PreQuoteCalculateDto, {
      plazaCodes: [468],
      discountPercent: 10,
      items: [{ productCode: 8738, quantity: 1 }],
      ...(clientCode !== undefined ? { clientCode } : {}),
    });
  }

  function createSubject() {
    const calculate = jest.fn().mockResolvedValue(preQuote);
    const findClientByCode = jest.fn().mockResolvedValue(client);

    const service = new CommercialProposalPreviewService(
      { calculate } as unknown as CommercialPreQuoteService,
      { findClientByCode } as unknown as CommercialFilterService,
    );

    return { service, calculate, findClientByCode };
  }

  it('mantém o contrato anterior sem cliente', async () => {
    const { service, calculate, findClientByCode } = createSubject();
    const input = createInput();

    const result = await service.preview(input);

    expect(findClientByCode).not.toHaveBeenCalled();
    expect(calculate).toHaveBeenCalledWith(input);
    expect(result.context).toEqual({
      plazaCodes: [468],
      discountPercent: 10,
    });
  });

  it('resolve o cliente por código e inclui os dados na prévia', async () => {
    const { service, calculate, findClientByCode } = createSubject();
    const input = createInput(35827);

    const result = await service.preview(input);

    expect(findClientByCode).toHaveBeenCalledTimes(1);
    expect(findClientByCode).toHaveBeenCalledWith(35827);
    expect(result.context.recipient).toEqual(client);
    expect(calculate).toHaveBeenCalledWith(input);
    expect(result.summary.tablePrice.gross).toBe(0);
  });

  it('rejeita cliente inexistente antes de calcular', async () => {
    const { service, calculate, findClientByCode } = createSubject();
    findClientByCode.mockResolvedValue(null);

    await expect(service.preview(createInput(999999))).rejects.toThrow(
      'não encontrado ou excluído',
    );

    expect(calculate).not.toHaveBeenCalled();
  });

  it('preserva o indicador BLOQUEIO sem criar impedimento', async () => {
    const { service, findClientByCode } = createSubject();
    findClientByCode.mockResolvedValue({
      ...client,
      blocked: 'S',
    });

    const result = await service.preview(createInput(35827));

    expect(result.context.recipient?.blocked).toBe('S');
  });

  it.each([0, -1, 1.5, '35827'])(
    'rejeita código de cliente inválido: %s',
    async (invalid) => {
      const dto = plainToInstance(PreQuoteCalculateDto, {
        plazaCodes: [468],
        discountPercent: 10,
        items: [{ productCode: 8738, quantity: 1 }],
        clientCode: invalid,
      });

      const errors = await validate(dto);

      expect(errors.map((error) => error.property)).toContain('clientCode');
    },
  );

  it('aceita cliente opcional e código positivo', async () => {
    expect(await validate(createInput())).toEqual([]);
    expect(await validate(createInput(35827))).toEqual([]);
  });

  it('consulta PCCLIENT por código usando bind Oracle', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        CODE: client.code,
        NAME: client.name,
        TRADE_NAME: client.tradeName,
        DOCUMENT: client.document,
        CITY: client.city,
        BLOCKED: client.blocked,
        NETWORK_CODE: client.networkCode,
      },
    ]);

    const service = new CommercialFilterService({
      query,
    } as unknown as OracleService);

    await expect(service.findClientByCode(35827)).resolves.toEqual(client);

    const [sql, binds] = query.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(sql).toContain('C.CODCLI = :clientCode');
    expect(sql).toContain('C.DTEXCLUSAO IS NULL');
    expect(binds).toEqual({ clientCode: 35827 });
  });

  it('retorna null para código não localizado', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new CommercialFilterService({
      query,
    } as unknown as OracleService);

    await expect(service.findClientByCode(999999)).resolves.toBeNull();
  });
});
