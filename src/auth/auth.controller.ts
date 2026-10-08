import { Body, Controller, HttpCode, HttpStatus, Post,Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { Public } from '../common/decorators/public.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)

  async signUp(@Body() signUpDto: SignUpDto,@Request() req: any) {
    return this.authService.signUp(signUpDto, req.headers['user-agent'], req.ip);
  }
  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto, @Request() req: any) {
    return this.authService.signIn(signInDto, req.headers['user-agent'], req.ip);
  }
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Request() req: any) {
    return this.authService.refresh(refreshTokenDto.refreshToken, req.headers['user-agent'], req.ip);
  }
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshTokenDto:RefreshTokenDto, @Request() req: any) {
    return this.authService.signOut(req.user.id, refreshTokenDto.refreshToken);
  }
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Request() req: any) {
    return this.authService.signOutAllSessions(req.user.id);
  }
}
