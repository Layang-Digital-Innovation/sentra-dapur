import { Controller, Post, Get, UseGuards, Request, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: { email: string; password: string; fullname?: string; name?: string; role?: string }) {
    const fullname = registerDto.fullname || registerDto.name || undefined;
    return this.authService.register(registerDto.email, registerDto.password, registerDto.role || 'INVESTOR', fullname);
  }

  @Get('test')
  @UseGuards(JwtAuthGuard)
  async testAuth(@Request() req) {
    console.log('Auth test endpoint reached, user:', req.user);
    return { message: 'Authentication successful', user: req.user };
  }
}