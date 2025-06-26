import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { SigInResult, UserIdentifier } from '@app/types';
import { JwtService } from '@nestjs/jwt';
import { SignInDto } from './dto/auth.dto';
import { ResponseBuilder } from '@app/response';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@app/core';
import { CreateUserDto } from 'src/user/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(where: Partial<UserIdentifier>, password): Promise<any> {
    const existUser = await this.userService.findUser(where);
    if (existUser) {
      const isPasswordValid = this.comparePassword(
        password,
        existUser.password,
      );
      if (isPasswordValid) {
        const { id, name, email, role } = existUser;
        const result: Partial<User> = {
          id,
          name,
          email,
          role,
        };
        return result;
      }
    } else {
      return null;
    }
  }

  async signIn(signInDto: SignInDto): Promise<ResponseBuilder<SigInResult>> {
    const { email, password } = signInDto;
    const user = await this.validateUser({ email }, password);

    if (!user) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('Invalid credentials', 'UNAUTHORIZED'),
      );
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    await this.userService.updateUserToken(user.id, refreshToken);

    return ResponseBuilder.OK_WITH({ user, accessToken, refreshToken });
  }
  async signUp(signUpDto: CreateUserDto) {
    const { email, name, password } = signUpDto;
    const existUser = await this.userService.findUser({ email });

    if (existUser) {
      throw new ConflictException(
        ResponseBuilder.Error('User already exists', 'CONFLICT'),
      );
    }

    const newUser = await this.userService.createUser(signUpDto);

    if (!newUser) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('User already exists', 'CONFLICT'),
      );
    }

    return ResponseBuilder.OK_WITH('Signup successful', newUser);
  }

  async refreshToken(uesrId: string, refreshToken: string) {
    const { token, ...user } = await this.userService.findUser({ id: uesrId });

    if (refreshToken !== token) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('Invalid token', 'REFRESH_UNAUTHORIZED_TOKEN'),
      );
    }

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    await this.userService.updateUserToken(user.id, newRefreshToken);

    return ResponseBuilder.OK_WITH({
      user,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  }

  private async generateAccessToken(user: Omit<User, 'token'>) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return this.jwtService.signAsync(payload, {
      expiresIn:
        this.configService.getOrThrow<AuthConfig>('jwt').accessToken.expiresIn,
      secret:
        this.configService.getOrThrow<AuthConfig>('jwt').accessToken.secret,
    });
  }

  private async generateRefreshToken(
    user: Omit<User, 'token'>,
  ): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return this.jwtService.signAsync(payload, {
      expiresIn:
        this.configService.getOrThrow<AuthConfig>('jwt').refreshToken.expiresIn,
      secret:
        this.configService.getOrThrow<AuthConfig>('jwt').refreshToken.secret,
    });
  }

  private comparePassword(password: string, hash: string): boolean {
    const result = bcrypt.compare(password, hash);
    if (!result) {
      throw new UnauthorizedException(
        ResponseBuilder.Error('The password is incorrect.', 'UNAUTHORIZED'),
      );
    }
    return true;
  }
}
