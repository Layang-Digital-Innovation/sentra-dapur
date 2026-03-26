import { Body, Controller, Get, Put, UseGuards, Request } from '@nestjs/common';
import { SettingsService, PlatformBankSettingsDto } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('platform-bank')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getPlatformBank() {
    return this.settingsService.getPlatformBankSettings();
  }

  @Put('platform-bank')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async updatePlatformBank(@Body() body: PlatformBankSettingsDto, @Request() req) {
    return this.settingsService.upsertPlatformBankSettings(body, req.user?.id);
  }
}
