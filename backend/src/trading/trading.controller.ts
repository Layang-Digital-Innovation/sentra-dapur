import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { TradingService } from './trading.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, OrderStatus, ShipmentMethod, ShipmentStatus } from '@prisma/client';

@Controller('trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  // Product Endpoints
  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN_PUSAT)
  async createProduct(@Request() req, @Body() data: {
    sellerId?: string;
    name: string;
    description: string;
    prices: Array<{ currency: 'IDR' | 'USD'; price: number }>;
    unit: string;
    weight: number;
    volume: string;
  }) {
    const targetSellerId = (req.user.role === Role.ADMIN_PUSAT && data.sellerId) ? data.sellerId : req.user.id;
    const status = (req.user.role === Role.ADMIN_PUSAT) ? "APPROVED" : undefined;
    return this.tradingService.createProduct(targetSellerId, { ...data, status: status as any });
  }

  // Public: list approved products (buyer browse)
  @Get('products')
  async getApprovedProducts(@Query('sellerId') sellerId?: string) {
    return this.tradingService.getApprovedProducts({ sellerId });
  }

  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    return this.tradingService.getProductById(id);
  }

  @Put('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN_PUSAT)
  async updateProduct(
    @Request() req,
    @Param('id') id: string,
    @Body() data: Partial<{
      name: string;
      description: string;
      prices: Array<{ currency: 'IDR' | 'USD'; price: number }>;
      unit: string;
      weight: number;
      volume: string;
    }>,
  ) {
    return this.tradingService.updateProduct(id, req.user.id, data);
  }

  // Seller: list own products (all statuses)
  @Get('seller/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN_PUSAT)
  async getSellerProducts(@Request() req) {
    return this.tradingService.getSellerProducts(req.user.id);
  }

  // Admin: list all products (any status)
  @Get('admin/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN)
  async getAllProductsAdmin() {
    return this.tradingService.getAllProducts();
  }

  // Seller: attach images to product (cover + previews)
  @Put('products/:id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN_PUSAT)
  async attachProductImages(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { cover?: { url: string; filename: string; originalName: string; size: number; mimeType: string } | null; previews?: Array<{ url: string; filename: string; originalName: string; size: number; mimeType: string }> }
  ) {
    return this.tradingService.attachProductImages(id, req.user.id, body);
  }

  // Admin: approve/reject product listings
  @Put('admin/products/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN)
  async approveProduct(@Request() req, @Param('id') id: string) {
    return this.tradingService.approveProduct(id, req.user.id);
  }

  @Put('admin/products/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN)
  async rejectProduct(@Request() req, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.tradingService.rejectProduct(id, req.user.id, reason);
  }

  // Order Endpoints
  @Post('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER)
  async createOrder(
    @Request() req,
    @Body() data: {
      productId: string;
      quantity: number;
      notes?: string;
      currency: 'IDR' | 'USD';
    },
  ) {
    return this.tradingService.createOrder(req.user.id, data);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(
    @Request() req,
    @Query('status') status?: OrderStatus,
  ) {
    // Determine filters based on user role
    const filters: any = {};
    
    if (req.user.role === Role.BUYER) {
      filters.buyerId = req.user.id;
    } else if (req.user.role === Role.SUPPLIER) {
      filters.sellerId = req.user.id;
    }
    
    if (status) {
      filters.status = status;
    }
    
    return this.tradingService.getOrders(filters);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  async getOrderById(@Param('id') id: string) {
    return this.tradingService.getOrderById(id);
  }

  @Put('orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN, Role.ADMIN_TRADING)
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.tradingService.updateOrderStatus(id, status);
  }

  // Admin: set fixed prices (for current schema supporting single-item orders)
  @Put('orders/:id/fixed-prices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN)
  async setOrderFixedPrices(
    @Param('id') id: string,
    @Body() body: { items: Array<{ fixedUnitPrice: number; currency: 'IDR' | 'USD' }> }
  ) {
    return this.tradingService.setOrderFixedPrices(id, body);
  }

  // Shipment Endpoints
  @Post('orders/:orderId/shipment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN, Role.ADMIN_TRADING)
  async createShipment(
    @Param('orderId') orderId: string,
    @Body() data: { method: ShipmentMethod },
  ) {
    return this.tradingService.createShipment(orderId, data);
  }

  @Put('shipments/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN, Role.ADMIN_TRADING)
  async updateShipmentStatus(
    @Param('id') id: string,
    @Body('status') status: ShipmentStatus,
  ) {
    return this.tradingService.updateShipmentStatus(id, status);
  }

  @Put('shipments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN, Role.ADMIN_TRADING)
  async updateShipment(
    @Param('id') id: string,
    @Body() body: { method?: ShipmentMethod; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; status?: ShipmentStatus; seaPricingMode?: 'CBM' | 'CONTAINER' | null; cbmVolume?: number | null; containerType?: 'FT20' | 'FT40' | null; freightCost?: number | null; currency?: string | null },
  ) {
    return this.tradingService.updateShipment(id, body);
  }

  // Seller profile: warehouse origin info
  @Get('seller/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN_PUSAT)
  async getSellerProfile(@Request() req) {
    return this.tradingService.getSellerProfile(req.user.id);
  }

  @Put('seller/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN_PUSAT)
  async upsertSellerProfile(
    @Request() req,
    @Body() data: { country?: string; address?: string; companyLogo?: string | null; companyName?: string | null; descriptions?: string | null; profileCompanyUrl?: string | null; profileCompanyFileName?: string | null },
  ) {
    return this.tradingService.upsertSellerProfile(req.user.id, data);
  }

  // Public (authenticated) profile view for buyers/admins
  @Get('seller/:userId/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN)
  async getSellerProfileById(@Param('userId') userId: string) {
    return this.tradingService.getSellerProfileById(userId);
  }

  // Shipping methods list
  @Get('shipping/methods')
  async listShippingMethods() {
    return this.tradingService.listShippingMethods();
  }

  // Analytics endpoints
  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.ADMIN_TRADING, Role.SUPER_ADMIN)
  async adminAnalytics() {
    return this.tradingService.getAdminTradingAnalytics();
  }

  @Get('buyer/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER)
  async buyerAnalytics(@Request() req) {
    return this.tradingService.getBuyerAnalytics(req.user.id);
  }

  @Get('seller/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER, Role.ADMIN_PUSAT)
  async sellerAnalytics(@Request() req) {
    return this.tradingService.getSellerAnalytics(req.user.id);
  }
}