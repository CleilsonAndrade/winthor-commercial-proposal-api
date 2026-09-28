const oracledb = require('oracledb');

process.loadEnvFile('.env');

async function main() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '1521';
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;
  const serviceName = process.env.DB_SERVICE_NAME;

  if (!host || !username || !password || !serviceName) {
    throw new Error(
      'Variáveis obrigatórias ausentes: DB_HOST, DB_USERNAME, DB_PASSWORD ou DB_SERVICE_NAME',
    );
  }

  const connectString = `${host}:${port}/${serviceName}`;

  console.log('Driver Oracle:', {
    version: oracledb.versionString,
    thin: oracledb.thin,
  });

  console.log('Destino Oracle:', {
    host,
    port,
    serviceName,
    username,
  });

  const connection = await oracledb.getConnection({
    user: username,
    password,
    connectString,
  });

  try {
    const result = await connection.execute(
      `SELECT
         1 AS TESTE,
         SYS_CONTEXT('USERENV', 'DB_NAME') AS BANCO,
         SYS_CONTEXT('USERENV', 'SESSION_USER') AS USUARIO
       FROM DUAL`,
      {},
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      },
    );

    console.log('Conexao Oracle: OK');
    console.log(result.rows);
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error('Conexao Oracle: FALHOU');
  console.error({
    name: error.name,
    message: error.message,
    errorNum: error.errorNum,
    offset: error.offset,
  });

  process.exitCode = 1;
});
