import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DonationService } from './donation.service';
import { CreateDonationDto } from './dto/create-donation.dto';

@Controller('donation')
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post('donate')
  donate(
    @Body()
    donation: CreateDonationDto,
  ) {
    return this.donationService.donate(donation);
  }

  @Get('events')
  getDonationEvents(
    @Query('token') token: string,
    @Query('since') since: string,
  ) {
    return this.donationService.getDonationEvents(token, since);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.donationService.getLeaderboard();
  }

  @Get(':id')
  getDonation(@Param('id') id: string) {
    return this.donationService.getDonation(id);
  }
}
