import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envConfig } from '../config/env.config';
import { DynamoModule } from '../dynamo/dynamo.module';
import { StorageModule } from '../storage/storage.module';
import { ItemsModule } from '../items/items.module';
import { SharesModule } from '../shares/shares.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    DynamoModule,
    StorageModule,
    ItemsModule,
    SharesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
