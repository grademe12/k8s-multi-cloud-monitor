import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { K8sService } from './k8s/k8s.service';
import { K8sController } from './k8s/k8s.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, K8sController],
  providers: [AppService, K8sService],
})
export class AppModule {}