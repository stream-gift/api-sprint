import { Controller, Get, Redirect, Req, Res, UseGuards } from '@nestjs/common';
import { TwitchGuard } from './guards/twitch.guard';
import { Response } from 'express';
import { COOKIE_NAME } from '../common/constants';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserId } from 'src/common/decorators/user.decorator';
import { getURL } from 'src/common/utils';
import { GoogleGuard } from './guards/google.guard';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('user')
  @UseGuards(JwtAuthGuard)
  getUser(@UserId() id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        googleImage: true,
        twitchImage: true,
      },
    });
  }

  @Get('twitch/login')
  @UseGuards(TwitchGuard)
  loginWithTwitch() {}

  @Get('twitch/callback')
  @UseGuards(TwitchGuard)
  loginWithTwitchCallback(@Req() req: any, @Res() response: Response) {
    return this.onProviderCallback(
      response,
      req.user.userId,
      req.user.isNewUser,
    );
  }

  @Get('google/login')
  @UseGuards(GoogleGuard)
  loginWithGoogle() {}

  @Get('google/callback')
  @UseGuards(GoogleGuard)
  loginWithGoogleCallback(@Req() req: any, @Res() response: Response) {
    return this.onProviderCallback(
      response,
      req.user.userId,
      req.user.isNewUser,
    );
  }

  onProviderCallback(response: Response, userId: string, isNewUser: boolean) {
    const jwt = this.jwtService.sign({ userId });

    const domain =
      this.configService.get('ENV') === 'production'
        ? this.configService.get('COOKIE_DOMAIN')
        : null;

    return response
      .cookie(COOKIE_NAME, jwt, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        ...(domain ? { domain } : {}),
      })
      .redirect(isNewUser ? getURL('client', '/onboard') : getURL('client'));
  }

  @Get('logout')
  logout(@Res() response: Response) {
    return response.clearCookie(COOKIE_NAME).redirect(getURL('client'));
  }
}
