const { NestFactory } = require('@nestjs/core');
const { ConfigService } = require('@nestjs/config');
const { AppModule } = require('../dist/app.module');
const {
  WinthorCredentialAuthProvider,
} = require('../dist/auth/providers/winthor-credential-auth.provider');

process.loadEnvFile('.env');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const configService = app.get(ConfigService);
    const provider = app.get(WinthorCredentialAuthProvider);

    const username = configService
      .get('AUTH_TEST_USERNAME')
      ?.trim();

    const password = configService.get('AUTH_TEST_PASSWORD');

    if (!username || !password) {
      throw new Error(
        'Preencha AUTH_TEST_USERNAME e AUTH_TEST_PASSWORD no .env',
      );
    }

    console.log('\n=== 1. CREDENCIAL CORRETA ===');

    const principal = await provider.authenticate({
      username,
      password,
    });

    if (!principal) {
      throw new Error(
        'A credencial informada não foi autenticada pelo WinThor.',
      );
    }

    console.log({
      registration: principal.registration,
      username: principal.username,
      displayName: principal.displayName,
      roles: principal.roles,
      status: principal.status,
      provider: principal.provider,
    });

    console.log('\n=== 2. SENHA INCORRETA ===');

    const invalidPasswordResult = await provider.authenticate({
      username,
      password: `${password}__INVALIDA__`,
    });

    console.log({
      expected: null,
      received: invalidPasswordResult,
      ok: invalidPasswordResult === null,
    });

    if (invalidPasswordResult !== null) {
      throw new Error(
        'Falha de segurança: senha incorreta foi aceita.',
      );
    }

    console.log('\n=== 3. USUARIO INEXISTENTE ===');

    const invalidUserResult = await provider.authenticate({
      username: `${username}__INEXISTENTE__`,
      password,
    });

    console.log({
      expected: null,
      received: invalidUserResult,
      ok: invalidUserResult === null,
    });

    if (invalidUserResult !== null) {
      throw new Error(
        'Falha de segurança: usuário inexistente foi aceito.',
      );
    }

    console.log('\n=== RESULTADO ===');
    console.log('Autenticacao WinThor validada com sucesso.');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('\nTeste de autenticacao WinThor: FALHOU');

  console.error({
    name: error?.name,
    message: error?.message,
    errorNum: error?.errorNum,
  });

  process.exitCode = 1;
});
