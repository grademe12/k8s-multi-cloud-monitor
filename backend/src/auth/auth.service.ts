import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string) {
    // 중복 체크
    const exists = await this.userRepository.findOne({ where: { email } });
    if (exists) {
      throw new BadRequestException('이미 사용 중인 이메일입니다');
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    await this.userRepository.save(user);

    // 토큰 생성
    const token = this.jwtService.sign({ id: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async login(email: string, password: string) {
    // 사용자 조회
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다');
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다');
    }

    // 토큰 생성
    const token = this.jwtService.sign({ id: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}