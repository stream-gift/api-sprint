import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TwitchGuard extends AuthGuard('twitch') {
  constructor() {
    super({
      accessType: 'offline',
    });
  }
}
