import {
  Controller,
  Post,
  Request,
  Body,
  UseGuards,
  Res,
  Get,
  Req,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local.auth.guard';
import { CreateUserDto } from 'src/user/dto/user.dto';
import { SignInDto } from './dto/auth.dto';
import { ResponseBuilder } from '@app/response';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { RefreshAuthGuard } from './guards/refresh.auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: '로그인 (Sign in)' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ status: 201, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  @UseGuards(LocalAuthGuard)
  @Post('signin')
  @HttpCode(200)
  async signin(@Body() sigInDto: SignInDto, @Res({ passthrough: true }) res) {
    const result = await this.authService.signIn(sigInDto);
    res.cookie('accessToken', result.data.accessToken, {
      httpOnly: true, // JS 접근 차단
      secure: true, // HTTPS에서만 전송
      sameSite: 'strict', // CSRF 방지 (상황에 따라 'lax' 또는 'none' 선택)
      maxAge: 15 * 60 * 1000, // 15분
    });

    res.cookie('refreshToken', result.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    return result;
  }

  @ApiOperation({ summary: '로그아웃 (Sign out)' })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('signout')
  async logout(@Res({ passthrough: true }) res) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return ResponseBuilder.OK();
  }

  @ApiOperation({ summary: '회원가입 (Sign up)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 409, description: '이미 존재하는 유저' })
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('signup')
  async signup(@Body() signUpDto: CreateUserDto) {
    return await this.authService.signUp(signUpDto);
  }

  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, description: '프로필 조회 성공' })
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Request() req) {
    return ResponseBuilder.OK_WITH(req.user);
  }

  @ApiOperation({ summary: '토큰 재발급 (Refresh)' })
  @ApiResponse({ status: 201, description: '토큰 재발급 성공' })
  @ApiCookieAuth()
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  async refresh(@Req() req, @Res({ passthrough: true }) res) {
    const { user } = req;
    const { sub, refreshToken, ...rest } = user;
    const result = await this.authService.refreshToken(sub, refreshToken);
    res.cookie('accessToken', result.data.accessToken, {
      httpOnly: true, // JS 접근 차단
      secure: true, // HTTPS에서만 전송
      sameSite: 'strict', // CSRF 방지 (상황에 따라 'lax' 또는 'none' 선택)
      maxAge: 15 * 60 * 1000, // 15분
    });

    res.cookie('refreshToken', result.data.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });
    return result;
  }
}
