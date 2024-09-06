import { Strategy, VerifyCallback } from 'passport-twitch-new';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { getURL } from 'src/common/utils';

@Injectable()
export class TwitchStrategy extends PassportStrategy(Strategy, 'twitch') {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      clientID: configService.get('TWITCH_CLIENT_ID'),
      clientSecret: configService.get('TWITCH_CLIENT_SECRET'),
      callbackURL: getURL('server', '/auth/twitch/callback'),
      scope: 'user_read',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    let user: any;

    // Find user by email
    user = await this.prismaService.user.findUnique({
      where: {
        email: profile.email,
      },
    });

    // First time logging in ever
    if (!user) {
      user = await this.prismaService.user.create({
        data: {
          email: profile.email,
          twitchData: profile,
          twitchImage: profile.profile_image_url,
        },
      });

      return done(null, { userId: user.id, isNewUser: true });
    }

    // First time logging in with Twitch
    if (!user.twitchData) {
      user = await this.prismaService.user.update({
        where: {
          email: user.email,
        },
        data: {
          twitchData: profile,
          twitchImage: profile.profile_image_url,
        },
      });
    }

    return done(null, { userId: user.id, isNewUser: false });
  }
}
