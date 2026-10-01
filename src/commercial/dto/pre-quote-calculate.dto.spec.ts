import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PreQuoteCalculateDto } from './pre-quote-calculate.dto';

describe('PreQuoteCalculateDto', () => {
  const validateDto = (input: Record<string, unknown>) => {
    const dto = plainToInstance(PreQuoteCalculateDto, input);

    return {
      dto,
      errors: validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    };
  };

  it('aplica desconto zero por padrão', async () => {
    const { dto, errors } = validateDto({
      plazaCodes: [468],
      items: [
        {
          productCode: 7624,
          quantity: 12,
        },
      ],
    });

    await expect(errors).resolves.toHaveLength(0);

    expect(dto.discountPercent).toBe(0);
  });

  it('aceita múltiplas praças e múltiplos produtos', async () => {
    const { errors } = validateDto({
      plazaCodes: [468, 383],
      discountPercent: 10,
      items: [
        {
          productCode: 7624,
          quantity: 12,
        },
        {
          productCode: 7625,
          quantity: 6,
        },
      ],
    });

    await expect(errors).resolves.toHaveLength(0);
  });

  it('exige ao menos um item', async () => {
    const { errors } = validateDto({
      plazaCodes: [468],
      items: [],
    });

    const result = await errors;

    expect(result.some((error) => error.property === 'items')).toBe(true);
  });

  it('rejeita produto repetido no mesmo pré-orçamento', async () => {
    const { errors } = validateDto({
      plazaCodes: [468],
      items: [
        {
          productCode: 7624,
          quantity: 12,
        },
        {
          productCode: 7624,
          quantity: 6,
        },
      ],
    });

    const result = await errors;

    expect(result.some((error) => error.property === 'items')).toBe(true);
  });

  it('rejeita quantidade zero ou negativa', async () => {
    const { errors } = validateDto({
      plazaCodes: [468],
      items: [
        {
          productCode: 7624,
          quantity: 0,
        },
      ],
    });

    const result = await errors;
    const itemErrors = result.find((error) => error.property === 'items');

    expect(itemErrors).toBeDefined();
  });

  it('não aceita preço enviado pelo cliente', async () => {
    const { errors } = validateDto({
      plazaCodes: [468],
      items: [
        {
          productCode: 7624,
          quantity: 12,
          unitPrice: 0.01,
        },
      ],
    });

    const result = await errors;
    const itemErrors = result.find((error) => error.property === 'items');

    expect(itemErrors).toBeDefined();
  });
});
