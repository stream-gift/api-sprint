import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Version,
  Query,
  Param,
  Delete,
} from '@nestjs/common';
import { StreamerService } from './streamer.service';
import { Currency } from '@prisma/client';
import { OnboardDto } from './dto/onboard.dto';
import { UserId } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('streamer')
export class StreamerController {
  constructor(private readonly streamerService: StreamerService) {}

  @Get('profile/:streamer')
  getProfile(@Param('streamer') streamer: string) {
    return this.streamerService.getProfile(streamer);
  }

  @Post('onboard')
  @UseGuards(JwtAuthGuard)
  onboard(@UserId() userId: string, @Body() body: OnboardDto) {
    return this.streamerService.onboard(userId, body);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  getSettings(@UserId() userId: string) {
    return this.streamerService.getSettings(userId);
  }

  @Post('settings/set')
  @UseGuards(JwtAuthGuard)
  setSettings(@UserId() userId: string, @Body() settings: any) {
    return this.streamerService.setSettings(userId, settings);
  }

  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  getAddresses(@UserId() userId: string) {
    return this.streamerService.getAddresses(userId);
  }

  @Post('addresses/add')
  @UseGuards(JwtAuthGuard)
  addAddress(
    @Body() body: { address: string; currency: Currency },
    @UserId() userId: string,
  ) {
    return this.streamerService.addAddress(userId, body.address, body.currency);
  }

  @Delete('addresses/remove')
  @UseGuards(JwtAuthGuard)
  removeAddress(
    @Body() body: { address: string; currency: Currency },
    @UserId() userId: string,
  ) {
    return this.streamerService.removeAddress(
      userId,
      body.address,
      body.currency,
    );
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@UserId() userId: string) {
    return this.streamerService.getDashboard(userId);
  }

  @Get('donations')
  @UseGuards(JwtAuthGuard)
  getDonations(@UserId() userId: string) {
    return this.streamerService.getDonations(userId);
  }

  @Get('balances')
  @UseGuards(JwtAuthGuard)
  getBalances(@UserId() userId: string) {
    return this.streamerService.getBalances(userId);
  }

  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  getWithdrawals(@UserId() userId: string) {
    return this.streamerService.getWithdrawals(userId);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  withdraw(
    @Body() body: { amount: number; address: string },
    @UserId() userId: string,
  ) {
    return this.streamerService.withdraw(userId, body.amount, body.address);
  }

  @Get('token')
  @UseGuards(JwtAuthGuard)
  getToken(@UserId() userId: string) {
    return this.streamerService.getToken(userId);
  }

  @Post('token/refresh')
  @UseGuards(JwtAuthGuard)
  refreshToken(@UserId() userId: string) {
    return this.streamerService.refreshToken(userId);
  }

  @Get('data')
  getData(@Query('token') token: string) {
    return this.streamerService.getStreamerData(token);
  }
}
