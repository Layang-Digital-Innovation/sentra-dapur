import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Request, UseGuards, BadRequestException
} from '@nestjs/common';
import { ProduksiService } from './produksi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

const PRODUKSI_ROLES = ['PRODUKSI', 'ADMIN_DAPUR', 'ADMIN_PUSAT', 'SUPER_ADMIN'] as Role[];
const ADMIN_ONLY = ['ADMIN_DAPUR', 'ADMIN_PUSAT', 'SUPER_ADMIN'] as Role[];

@Controller('produksi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProduksiController {
  constructor(private readonly produksiService: ProduksiService) {}

  // ─── JENIS PORSI ────────────────────────────────────────────────────
  @Roles('ADMIN_PUSAT', 'SUPER_ADMIN')
  @Post('porsi')
  createPortionType(@Body() body: { name: string; description?: string }) {
    return this.produksiService.createPortionType(body);
  }

  @Roles(...PRODUKSI_ROLES)
  @Get('porsi')
  getPortionTypes() {
    return this.produksiService.getPortionTypes();
  }

  @Roles('ADMIN_PUSAT', 'SUPER_ADMIN')
  @Put('porsi/:id')
  updatePortionType(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.produksiService.updatePortionType(id, body);
  }

  @Roles('ADMIN_PUSAT', 'SUPER_ADMIN')
  @Delete('porsi/:id')
  deletePortionType(@Param('id') id: string) {
    return this.produksiService.deletePortionType(id);
  }

  // ─── TEMPLATE MENU ──────────────────────────────────────────────────
  @Roles(...PRODUKSI_ROLES)
  @Post('menu')
  createMenu(
    @Request() req,
    @Body() body: { 
      name: string; 
      description?: string; 
      category?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      dapurUnitId?: string;
    },
  ) {
    return this.produksiService.createMenu(body, req.user);
  }

  @Roles(...PRODUKSI_ROLES)
  @Post('menu/bulk')
  createMenuBulk(
    @Request() req,
    @Body() body: { 
      menus: {
        name: string; 
        category?: string;
        calories?: number; 
        protein?: number; 
        carbs?: number; 
        fat?: number;
        ingredients: { portionTypeName: string; ingredientName: string; quantity: number; unit: string; }[]
      }[];
      dapurUnitId?: string;
    },
  ) {
    return this.produksiService.createMenuBulk(body, req.user);
  }

  @Roles(...PRODUKSI_ROLES)
  @Get('menu')
  getMenus(@Query('dapurUnitId') dapurUnitId?: string) {
    return this.produksiService.getMenus(dapurUnitId);
  }

  @Roles(...PRODUKSI_ROLES)
  @Get('menu/:id')
  getMenuById(@Param('id') id: string) {
    return this.produksiService.getMenuById(id);
  }

  @Roles('ADMIN_DAPUR', 'PRODUKSI', 'SUPER_ADMIN')
  @Post('menu/:id/copy')
  copyGlobalMenu(
    @Param('id') id: string,
    @Body('dapurUnitId') dapurUnitId: string,
    @Request() req,
  ) {
    if (!dapurUnitId) {
      throw new BadRequestException('dapurUnitId harus diisi');
    }
    return this.produksiService.copyMenuFromGlobal(id, dapurUnitId, req.user);
  }

  @Roles(...PRODUKSI_ROLES)
  @Put('menu/:id')
  updateMenu(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { 
      name?: string; 
      description?: string; 
      category?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    },
  ) {
    return this.produksiService.updateMenu(id, body, req.user);
  }

  @Roles(...PRODUKSI_ROLES)
  @Delete('menu/:id')
  deleteMenu(@Request() req, @Param('id') id: string) {
    return this.produksiService.deleteMenu(id, req.user);
  }

  // ─── BAHAN BAKU PER MENU ────────────────────────────────────────────
  @Roles(...PRODUKSI_ROLES)
  @Put('menu/:id/ingredients')
  upsertIngredients(
    @Request() req,
    @Param('id') menuId: string,
    @Body() body: {
      ingredients: { portionTypeId: string; ingredientName: string; unit: string; gramsPerPortion: number }[];
    },
  ) {
    return this.produksiService.upsertMenuIngredients(menuId, body.ingredients, req.user);
  }

  @Roles(...PRODUKSI_ROLES)
  @Delete('ingredient/:id')
  deleteIngredient(@Request() req, @Param('id') id: string) {
    return this.produksiService.deleteMenuIngredient(id, req.user);
  }

  // ─── RENCANA MENU BULANAN ───────────────────────────────────────────
  @Roles(...PRODUKSI_ROLES)
  @Get('dapur/:dapurId/rencana/:year/:month')
  getOrCreateMonthlyPlan(
    @Param('dapurId') dapurId: string,
    @Param('year') year: string,
    @Param('month') month: string,
    @Request() req,
  ) {
    return this.produksiService.getOrCreateMonthlyPlan(
      dapurId,
      parseInt(year),
      parseInt(month),
      req.user.id,
    );
  }

  @Roles(...PRODUKSI_ROLES)
  @Post('rencana/:planId/daily')
  setDailyMenu(
    @Param('planId') planId: string,
    @Body() body: {
      date: string;
      entries: { menuId: string; notes?: string; portions: { portionTypeId: string; quantity: number }[] }[];
    },
  ) {
    return this.produksiService.setDailyMenu(planId, body.date, body.entries);
  }

  @Roles(...PRODUKSI_ROLES)
  @Get('rencana/:planId/daily')
  getDailyEntries(@Param('planId') planId: string) {
    return this.produksiService.getDailyEntries(planId);
  }

  @Roles(...PRODUKSI_ROLES)
  @Delete('daily/:id')
  deleteDailyEntry(@Param('id') id: string) {
    return this.produksiService.deleteDailyEntry(id);
  }

  // ─── KALKULASI KEBUTUHAN BAHAN (untuk PO) ───────────────────────────
  @Roles(...PRODUKSI_ROLES)
  @Get('rencana/:planId/kalkulasi')
  calculateNeeds(
    @Param('planId') planId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.produksiService.calculateIngredientNeeds(planId, start, end);
  }

  // ─── KALKULASI HPP ───────────────────────────
  @Roles(...PRODUKSI_ROLES)
  @Get('rencana/:planId/hpp')
  calculateHPP(
    @Param('planId') planId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.produksiService.calculateHPP(planId, start, end);
  }
}
