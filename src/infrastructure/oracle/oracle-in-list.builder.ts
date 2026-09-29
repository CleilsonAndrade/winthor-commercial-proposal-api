export interface OracleInList {
  placeholders: string;
  binds: Record<string, number>;
}

export function buildOracleInList(
  prefix: string,
  values: readonly number[] | null | undefined,
): OracleInList | null {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(prefix)) {
    throw new Error(`Prefixo de bind Oracle inválido: ${prefix}`);
  }

  if (!values || values.length === 0) {
    return null;
  }

  const binds: Record<string, number> = {};

  const placeholders = values.map((value, index) => {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Valor inválido para bind Oracle ${prefix}[${index}]`);
    }

    const bindName = `${prefix}${index}`;

    binds[bindName] = value;

    return `:${bindName}`;
  });

  return {
    placeholders: placeholders.join(', '),
    binds,
  };
}
