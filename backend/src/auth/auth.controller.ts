import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: { email: string; password: string; name: string }) {
    return this.authService.register(dto.email, dto.password, dto.name);
  }

  @Post('login')
  async login(@Body() dto: { email: string; password: string }) {
    return this.authService.login(dto.email, dto.password);
  }

  // 현재 로그인한 사용자 정보 조회 (추가)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.getUserById(req.user.id);
  }

  // 로그아웃 엔드포인트 (선택적 - 로그 기록용)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    // 로그 기록 등의 작업 수행
    console.log(`User ${req.user.email} logged out at ${new Date()}`);
    return { message: '로그아웃 되었습니다' };
  }
}