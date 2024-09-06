import { Strategy, VerifyCallback } from 'passport-google-oauth2';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { getURL } from 'src/common/utils';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: getURL('server', '/auth/google/callback'),
      scope: ['email', 'profile'],
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
          googleData: profile,
          googleImage: profile.picture,
        },
      });

      return done(null, { userId: user.id, isNewUser: true });
    }

    // First time logging in with Google
    if (!user.googleData) {
      user = await this.prismaService.user.update({
        where: {
          email: user.email,
        },
        data: {
          googleData: profile,
          googleImage: profile.picture,
        },
      });
    }

    return done(null, { userId: user.id, isNewUser: false });
  }
}
