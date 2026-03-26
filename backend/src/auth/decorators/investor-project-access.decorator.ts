import { UseGuards, applyDecorators } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { InvestorProjectAccessGuard } from '../guards/investor-project-access.guard';

export function RequireProjectAccess() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, InvestorProjectAccessGuard),
  );
}