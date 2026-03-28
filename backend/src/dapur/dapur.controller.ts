import { Controller, Post, Get, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { DapurService } from './dapur.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, ArusKasType, POStatus } from '@prisma/client';

@Controller('dapur')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DapurController {
  constructor(private readonly dapurService: DapurService) {}

  @Roles('PROJECT_OWNER', 'ADMIN_PUSAT', 'SUPER_ADMIN')
  @Post()
  async createDapur(@Request() req, @Body() data: { name: string; location?: string; adminPusatId?: string }) {
    return this.dapurService.createDapurUnit(req.user.id, req.user.role, data);
  }

  @Roles('PROJECT_OWNER', 'ADMIN_PUSAT')
  @Post(':id/assign-admin-dapur')
  async assignAdminDapur(
    @Request() req,
    @Param('id') id: string,
    @Body('adminDapurId') adminDapurId: string
  ) {
    return this.dapurService.assignAdminDapur(id, req.user.id, adminDapurId);
  }

  @Roles('PROJECT_OWNER', 'ADMIN_PUSAT')
  @Post(':id/investors')
  async setInvestors(
    @Request() req,
    @Param('id') id: string,
    @Body('investors') investors: { investorId: string; amount: number; profitSharingPct: number }[]
  ) {
    return this.dapurService.setDapurInvestors(req.user.id, req.user.role, id, investors);
  }

  // OPERASIONAL 
  @Roles('ADMIN_DAPUR')
  @Post(':id/arus-kas')
  async reportArusKas(
    @Request() req,
    @Param('id') id: string,
    @Body() data: any
  ) {
    return this.dapurService.reportArusKas(req.user.id, id, data);
  }

  @Get(':id/arus-kas')
  async getArusKas(@Request() req, @Param('id') id: string, @Query('bookType') bookType?: any) {
    return this.dapurService.getArusKas(id, bookType);
  }

  @Roles('ADMIN_DAPUR', 'PRODUKSI')
  @Post(':id/stok')
  async updateStok(
    @Request() req,
    @Param('id') id: string,
    @Body() data: { itemName: string; quantity: number; unit: string }
  ) {
    return this.dapurService.updateStok(req.user.id, id, data);
  }

  // PURCHASE ORDERS
  @Roles('ADMIN_DAPUR')
  @Post(':id/po')
  async createPO(
    @Request() req,
    @Param('id') id: string,
    @Body('items') items: { productName: string; quantity: number; unit?: string; supplierName?: string; pricePerUnit?: number }[],
    @Body('type') type?: string
  ) {
    return this.dapurService.createPurchaseOrder(req.user.id, id, items, type as any);
  }

  @Roles('ADMIN_PUSAT', 'ADMIN_DAPUR')
  @Put('po/:poId')
  async updatePurchaseOrder(
    @Request() req,
    @Param('poId') poId: string,
    @Body('items') items: any[]
  ) {
    return this.dapurService.updatePurchaseOrderItems(req.user.id, poId, items);
  }

  @Roles('ADMIN_PUSAT', 'ADMIN_DAPUR')
  @Post('po/:poId/send')
  async sendToSupplier(
    @Request() req,
    @Param('poId') poId: string,
    @Body('supplierName') supplierName: string
  ) {
    return this.dapurService.sendPOToSupplier(req.user.id, poId, supplierName);
  }

  @Roles('ADMIN_PUSAT')
  @Put('po/:poId/approve')
  async approvePO(
    @Request() req,
    @Param('poId') poId: string,
    @Body('status') status: POStatus
  ) {
    return this.dapurService.approvePO(req.user.id, poId, status);
  }

  @Get('po')
  async getAllPurchaseOrders(@Request() req) {
     return this.dapurService.getAllPurchaseOrders(req.user.id, req.user.role);
  }

  @Roles('ADMIN_PUSAT', 'PROJECT_OWNER')
  @Put('arus-kas/:id/approve')
  async approveArusKas(@Request() req, @Param('id') id: string) {
    return this.dapurService.approveArusKas(req.user.id, id);
  }

  @Roles('ADMIN_PUSAT', 'PROJECT_OWNER')
  @Put('arus-kas/:id/reject')
  async rejectArusKas(@Request() req, @Param('id') id: string) {
    return this.dapurService.rejectArusKas(req.user.id, id);
  }

  // VIEWS
  @Get()
  async getMyDapur(@Request() req) {
    return this.dapurService.getDapurList(req.user.id, req.user.role);
  }

  @Get('my-unit')
  async getMyUnit(@Request() req) {
    return this.dapurService.getMyDapurUnit(req.user.id, req.user.role);
  }

  @Roles('PROJECT_OWNER', 'ADMIN_PUSAT', 'ADMIN_DAPUR', 'SUPER_ADMIN')
  @Put(':id/branding')
  async updateBranding(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.dapurService.updateDapurBranding(id, req.user.id, req.user.role, data);
  }

  // STOK & LOADING
  @Roles('ADMIN_DAPUR', 'PRODUKSI')
  @Get('my-stok')
  async getMyStok(@Request() req, @Query('category') category?: string) {
    return this.dapurService.getStok(req.user.id, category);
  }

  @Roles('ADMIN_DAPUR', 'PRODUKSI')
  @Get('po/incoming')
  async getIncomingPOs(@Request() req) {
    return this.dapurService.getPendingReceptionPOs(req.user.id);
  }

  @Roles('ADMIN_DAPUR', 'PRODUKSI')
  @Get('po/history')
  async getLoadingHistory(@Request() req) {
    return this.dapurService.getLoadingGoodsHistory(req.user.id);
  }

  @Roles('ADMIN_DAPUR', 'PRODUKSI')
  @Post('po/:poId/receive')
  async receivePO(
    @Request() req,
    @Param('poId') poId: string,
    @Body() data: any
  ) {
    return this.dapurService.receivePurchaseOrder(req.user.id, poId, data);
  }

  @Roles('ADMIN_DAPUR')
  @Post(':id/po/:poId/pay')
  async payPO(
    @Request() req,
    @Param('id') id: string,
    @Param('poId') poId: string,
    @Body() body: { bookType: 'UMUM' | 'PEMBANTU'; referenceNo?: string; evidenceUrl?: string; transactionDate?: string }
  ) {
    return this.dapurService.payPurchaseOrder(req.user.id, poId, body.bookType as any, {
      referenceNo: body.referenceNo,
      evidenceUrl: body.evidenceUrl,
      transactionDate: body.transactionDate ? new Date(body.transactionDate) : undefined
    });
  }

  @Roles('ADMIN_DAPUR')
  @Post(':id/arus-kas/transfer')
  async transfer(
    @Request() req,
    @Param('id') id: string,
    @Body() data: { amount: number; fromBook: any; toBook: any; description: string; transactionDate?: string }
  ) {
    return this.dapurService.transferArusKas(req.user.id, id, {
      ...data,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined
    });
  }

  // ============================================================
  // DAPUR DIVIDEND — Laporan Bagi Hasil per Dapur
  // ============================================================

  /** Admin Pusat / Project Owner melaporkan bagi hasil untuk investor */
  @Roles('ADMIN_PUSAT', 'PROJECT_OWNER', 'SUPER_ADMIN')
  @Post(':id/dividend')
  async reportDividend(
    @Request() req,
    @Param('id') dapurId: string,
    @Body() body: { totalAmount: number; period?: string; description?: string }
  ) {
    return this.dapurService.reportDapurDividend(req.user.id, dapurId, body);
  }

  /** Lihat riwayat laporan bagi hasil untuk suatu Dapur */
  @Roles('ADMIN_PUSAT', 'PROJECT_OWNER', 'SUPER_ADMIN')
  @Get(':id/dividends')
  async getDividends(@Param('id') dapurId: string) {
    return this.dapurService.getDapurDividends(dapurId);
  }

  // ============================================================
  // SUPPLIER CASHBACK — Pencatatan Cashback
  // ============================================================

  @Roles('ADMIN_PUSAT', 'PROJECT_OWNER', 'SUPER_ADMIN')
  @Post(':id/cashback')
  async reportCashback(
    @Request() req,
    @Param('id') id: string,
    @Body() data: { amount: number; supplierName?: string; purchaseOrderId?: string; description?: string; transactionDate?: string }
  ) {
    return this.dapurService.reportCashback(req.user.id, req.user.role, id, data);
  }

  @Roles('ADMIN_PUSAT', 'PROJECT_OWNER', 'SUPER_ADMIN')
  @Get(':id/cashbacks')
  async getCashbacks(@Request() req, @Param('id') id: string) {
    return this.dapurService.getCashbackHistory(req.user.role, id);
  }
}
