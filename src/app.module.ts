import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AppService } from './app.service';
import { CommercialModule } from './commercial/commercial.module';
import { OracleModule } from './infrastructure/oracle/oracle.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OracleModule,
    AuthModule,
    CommercialModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
