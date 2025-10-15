import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

@Global()  // 전역으로 설정!
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class CommonModule {}