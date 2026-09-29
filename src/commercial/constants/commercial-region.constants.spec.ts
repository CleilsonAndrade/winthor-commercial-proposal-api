import {
  COMMERCIAL_HOMOLOGATED_REGION_CODES,
  COMMERCIAL_SPECIAL_REGION_CODES,
  COMMERCIAL_UF_REGION_CODES,
} from './commercial-region.constants';

describe('Commercial region constants', () => {
  it('mantém exatamente 36 regiões homologadas sem duplicidade', () => {
    expect(COMMERCIAL_HOMOLOGATED_REGION_CODES).toHaveLength(36);

    expect(new Set(COMMERCIAL_HOMOLOGATED_REGION_CODES).size).toBe(36);

    expect(
      [...COMMERCIAL_UF_REGION_CODES, ...COMMERCIAL_SPECIAL_REGION_CODES].sort(
        (a, b) => a - b,
      ),
    ).toEqual([...COMMERCIAL_HOMOLOGATED_REGION_CODES].sort((a, b) => a - b));
  });

  it('classifica as 27 regiões estaduais como UF', () => {
    expect(COMMERCIAL_UF_REGION_CODES).toHaveLength(27);
    expect(COMMERCIAL_UF_REGION_CODES).toContain(368);
    expect(COMMERCIAL_UF_REGION_CODES).not.toContain(332);
  });

  it('classifica as 9 regiões de cliente e canal como especiais', () => {
    expect(COMMERCIAL_SPECIAL_REGION_CODES).toHaveLength(9);
    expect(COMMERCIAL_SPECIAL_REGION_CODES).toContain(332);
    expect(COMMERCIAL_SPECIAL_REGION_CODES).not.toContain(368);
  });
});
