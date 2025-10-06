@Controller('auth')
export class AuthController {
  
  @Post('login')
  async login(@Body() dto: LoginDto) {
    // 사용자 확인
    const user = await this.userService.findByEmail(dto.email)
    if (!user || !bcrypt.compareSync(dto.password, user.password)) {
      throw new UnauthorizedException('Invalid credentials')
    }
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    return { token, user: { id: user.id, email: user.email, name: user.name } }
  }
  
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    // 중복 체크
    const exists = await this.userService.findByEmail(dto.email)
    if (exists) {
      throw new BadRequestException('Email already exists')
    }
    
    // 사용자 생성
    const hashedPassword = bcrypt.hashSync(dto.password, 10)
    const user = await this.userService.create({
      ...dto,
      password: hashedPassword
    })
    
    // 토큰 생성
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    return { token, user: { id: user.id, email: user.email, name: user.name } }
  }
}