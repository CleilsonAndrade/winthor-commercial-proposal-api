export type CommercialRegionType = 'UF' | 'ESPECIAL';

export const COMMERCIAL_REGION_DEFINITIONS = [
  [300, 'UF'],
  [302, 'UF'],
  [308, 'UF'],
  [310, 'UF'],
  [314, 'UF'],
  [321, 'UF'],
  [324, 'UF'],
  [327, 'UF'],
  [328, 'UF'],
  [330, 'UF'],
  [332, 'ESPECIAL'],
  [334, 'UF'],
  [336, 'UF'],
  [338, 'UF'],
  [340, 'UF'],
  [342, 'UF'],
  [344, 'UF'],
  [346, 'UF'],
  [348, 'UF'],
  [350, 'UF'],
  [352, 'UF'],
  [355, 'UF'],
  [357, 'UF'],
  [362, 'UF'],
  [367, 'UF'],
  [368, 'UF'],
  [370, 'UF'],
  [372, 'UF'],
  [376, 'ESPECIAL'],
  [377, 'ESPECIAL'],
  [381, 'ESPECIAL'],
  [382, 'ESPECIAL'],
  [383, 'ESPECIAL'],
  [480, 'ESPECIAL'],
  [481, 'ESPECIAL'],
  [1000, 'ESPECIAL'],
] as const satisfies readonly (readonly [number, CommercialRegionType])[];

export const COMMERCIAL_HOMOLOGATED_REGION_CODES =
  COMMERCIAL_REGION_DEFINITIONS.map(([code]) => code);

export const COMMERCIAL_UF_REGION_CODES = COMMERCIAL_REGION_DEFINITIONS.filter(
  ([, type]) => type === 'UF',
).map(([code]) => code);

export const COMMERCIAL_SPECIAL_REGION_CODES =
  COMMERCIAL_REGION_DEFINITIONS.filter(([, type]) => type === 'ESPECIAL').map(
    ([code]) => code,
  );

export const COMMERCIAL_HOMOLOGATED_REGION_CODES_SQL =
  COMMERCIAL_HOMOLOGATED_REGION_CODES.join(',');

export const COMMERCIAL_UF_REGION_CODES_SQL =
  COMMERCIAL_UF_REGION_CODES.join(',');
