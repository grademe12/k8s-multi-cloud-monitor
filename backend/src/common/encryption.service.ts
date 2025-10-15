// backend/src/common/encryption.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private secretKey: Buffer;
  
  constructor(private configService: ConfigService) {
    // .env에서 암호화 키 가져오기
    const secret = this.configService.get('ENCRYPTION_SECRET_KEY');
    if (!secret || secret.length < 32) {
      throw new Error('ENCRYPTION_SECRET_KEY must be at least 32 characters');
    }
    // 32바이트 키 생성
    this.secretKey = crypto.scryptSync(secret, 'salt', 32);
  }

  /**
   * 토큰 암호화
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag();
    
    // IV + AuthTag + 암호화된 데이터를 합쳐서 반환
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * 토큰 복호화
   */
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
    (decipher as any).setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}