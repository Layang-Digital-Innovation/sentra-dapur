import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, ShipmentMethod, ShipmentStatus, ProductStatus } from '@prisma/client';

@Injectable()
export class TradingService {
  constructor(private prisma: PrismaService) {}

  // ─── BOM Conversion helpers ────────────────────────────────────────────────
  private validateBomConversions(bomConversions: Array<{ productionUnit: string; conversionFactor: number }>) {
    for (const bom of bomConversions) {
      if (!bom.productionUnit || !bom.productionUnit.trim()) {
        throw new BadRequestException('productionUnit tidak boleh kosong');
      }
      if (bom.conversionFactor <= 0) {
        throw new BadRequestException('conversionFactor harus lebih besar dari 0');
      }
    }
  }

  // Product Management
  async createProduct(sellerId: string, data: {
    name: string;
    description: string;
    prices: Array<{ currency: 'IDR' | 'USD'; price: number }>;
    unit: string;
    weight: number;
    volume: string;
    status?: ProductStatus;
    bomConversions?: Array<{ productionUnit: string; conversionFactor: number }>;
  }) {
    if (data.bomConversions?.length) {
      this.validateBomConversions(data.bomConversions);
    }

    return this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        unit: data.unit,
        weight: data.weight,
        volume: data.volume,
        status: data.status,
        sellerId,
        prices: {
          create: data.prices.map(p => ({ currency: p.currency as any, price: p.price })),
        },
        ...(data.bomConversions?.length ? {
          bomConversions: {
            create: data.bomConversions.map(b => ({
              productionUnit: b.productionUnit.trim(),
              conversionFactor: b.conversionFactor,
            })),
          },
        } : {}),
      },
      include: { prices: true, bomConversions: true },
    });
  }

  async updateShipment(id: string, data: { method?: ShipmentMethod; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; status?: ShipmentStatus; seaPricingMode?: any; cbmVolume?: number | null; containerType?: any; freightCost?: number | null; currency?: string | null }) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return this.prisma.shipment.update({
      where: { id },
      data: {
        method: data.method ?? shipment.method,
        carrier: data.carrier !== undefined ? data.carrier : shipment.carrier,
        trackingNumber: data.trackingNumber !== undefined ? data.trackingNumber : shipment.trackingNumber,
        trackingUrl: data.trackingUrl !== undefined ? data.trackingUrl : shipment.trackingUrl,
        status: data.status ?? shipment.status,
        seaPricingMode: data.seaPricingMode !== undefined ? data.seaPricingMode : (shipment as any).seaPricingMode,
        cbmVolume: data.cbmVolume !== undefined ? data.cbmVolume : (shipment as any).cbmVolume,
        containerType: data.containerType !== undefined ? data.containerType : (shipment as any).containerType,
        freightCost: data.freightCost !== undefined ? data.freightCost : (shipment as any).freightCost,
        currency: data.currency !== undefined ? data.currency : (shipment as any).currency,
      },
    });
  }

  async getApprovedProducts(filters?: { sellerId?: string }) {
    const where: any = { status: ProductStatus.APPROVED };
    if (filters?.sellerId) where.sellerId = filters.sellerId;
    return this.prisma.product.findMany({
      where,
      include: {
        seller: {
          select: { id: true, email: true, fullname: true, SellerProfile: true },
        },
        images: true,
        prices: true,
        bomConversions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, email: true, fullname: true, SellerProfile: true } },
        images: true,
        prices: true,
        bomConversions: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async applyProductFieldsUpdate(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      prices: Array<{ currency: 'IDR' | 'USD'; price: number }>;
      unit: string;
      weight: number;
      volume: string;
      bomConversions: Array<{ productionUnit: string; conversionFactor: number }> | null;
    }>,
  ) {
    const { prices, bomConversions, ...rest } = data as any;

    // Validate bomConversions if provided
    if (Array.isArray(bomConversions) && bomConversions.length) {
      this.validateBomConversions(bomConversions);
    }

    await this.prisma.product.update({
      where: { id },
      data: rest,
    });

    if (Array.isArray(prices)) {
      await this.prisma.productPrice.deleteMany({ where: { productId: id } });
      if (prices.length) {
        await this.prisma.productPrice.createMany({
          data: prices.map((p: any) => ({ productId: id, currency: p.currency as any, price: p.price })),
          skipDuplicates: true,
        });
      }
    }

    // Replace strategy: if bomConversions is an array (including []), replace all; if undefined, keep existing
    if (Array.isArray(bomConversions)) {
      await this.prisma.productBomConversion.deleteMany({ where: { productId: id } });
      if (bomConversions.length) {
        await this.prisma.productBomConversion.createMany({
          data: bomConversions.map((b: any) => ({
            productId: id,
            productionUnit: b.productionUnit.trim(),
            conversionFactor: b.conversionFactor,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.product.findUnique({ where: { id }, include: { prices: true, bomConversions: true } });
  }

  async updateProduct(id: string, sellerId: string, data: Partial<{
    name: string;
    description: string;
    prices: Array<{ currency: 'IDR' | 'USD'; price: number }>;
    unit: string;
    weight: number;
    volume: string;
    bomConversions: Array<{ productionUnit: string; conversionFactor: number }> | null;
  }>) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('You do not have permission to update this product');
    }

    return this.applyProductFieldsUpdate(id, data);
  }

  /** Admin pusat / trading: update any product without seller ownership check */
  async adminUpdateProduct(id: string, data: Partial<{
    name: string;
    description: string;
    prices: Array<{ currency: 'IDR' | 'USD'; price: number }>;
    unit: string;
    weight: number;
    volume: string;
    bomConversions: Array<{ productionUnit: string; conversionFactor: number }> | null;
  }>) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.applyProductFieldsUpdate(id, data);
  }

  async deleteProductAsAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product._count.orders > 0) {
      throw new BadRequestException('Produk tidak dapat dihapus karena sudah memiliki pesanan.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.pOItem.updateMany({ where: { productId: id }, data: { productId: null } });
      await tx.product.delete({ where: { id } });
    });
    return { ok: true };
  }

  async getSellerProducts(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      include: { prices: true, bomConversions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllProducts() {
    return this.prisma.product.findMany({
      include: {
        seller: { select: { id: true, email: true, fullname: true } },
        images: true,
        prices: true,
        bomConversions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveProduct(id: string, adminUserId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.APPROVED, approvedBy: adminUserId, approvedAt: new Date() },
    });
  }

  async rejectProduct(id: string, adminUserId: string, reason?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    // Store rejection by flipping status and optionally capturing reason in description suffix
    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.REJECTED, approvedBy: adminUserId, approvedAt: new Date(), description: reason ? `${product.description}\n\n[Rejected]: ${reason}` : product.description },
    });
  }

  // Order Management
  async createOrder(buyerId: string, data: {
    productId: string;
    quantity: number;
    notes?: string;
    currency: 'IDR' | 'USD';
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
      include: { prices: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Resolve price for selected currency
    const priceRow = product.prices.find((pp: any) => pp.currency === data.currency);
    if (!priceRow) throw new NotFoundException('Price not available for selected currency');
    const pricePerUnit = priceRow.price;
    const totalPrice = pricePerUnit * data.quantity;

    const order = await this.prisma.order.create({
      data: {
        productId: data.productId,
        buyerId,
        quantity: data.quantity,
        notes: data.notes,
        currency: data.currency as any,
        pricePerUnit,
        totalPrice,
      },
      include: {
        product: { include: { prices: true } },
      },
    });

    // Notify all admins about new trading order
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' } as any, select: { id: true } });
    const superAdmins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } as any, select: { id: true } });
    const notifyUsers = [...admins, ...superAdmins];
    if (notifyUsers.length) {
      await this.prisma.notification.createMany({
        data: notifyUsers.map(u => ({
          userId: u.id,
          title: 'New Trading Order',
          message: `A new order has been placed for product ${product.name} (${data.currency})`,
          type: 'TRADING_ORDER',
          relatedId: order.id,
        })),
        skipDuplicates: true,
      });
    }

    return order;
  }

  async getOrders(filters?: { buyerId?: string; sellerId?: string; status?: OrderStatus }) {
    let where: any = {};

    if (filters?.buyerId) {
      where.buyerId = filters.buyerId;
    }

    if (filters?.sellerId) {
      where.product = {
        sellerId: filters.sellerId,
      };
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                fullname: true,
              },
            },
            images: true,
          },
        },
        buyer: {
          select: {
            id: true,
            email: true,
            fullname: true,
          },
        },
        shipment: true,
      },
    });
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                fullname: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            email: true,
            fullname: true,
          },
        },
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  // Admin: set fixed prices (current schema supports single-item orders)
  async setOrderFixedPrices(id: string, body: { items: Array<{ fixedUnitPrice: number; currency: 'IDR' | 'USD' }> }) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      throw new NotFoundException('No items provided');
    }
    const first = body.items[0];
    const pricePerUnit = Number(first.fixedUnitPrice);
    const currency = first.currency as any;
    const totalPrice = pricePerUnit * Number(order.quantity || 0);
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        pricePerUnit,
        totalPrice,
        currency,
      },
      include: {
        product: { include: { prices: true } },
        buyer: { select: { id: true, email: true, fullname: true } },
        shipment: true,
      },
    });
    return updated;
  }

  // Shipment Management
  async createShipment(orderId: string, data: { method: ShipmentMethod }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.shipment) {
      throw new ForbiddenException('Shipment already exists for this order');
    }

    return this.prisma.shipment.create({
      data: {
        method: data.method,
        orderId,
      },
    });
  }

  async updateShipmentStatus(id: string, status: ShipmentStatus) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return this.prisma.shipment.update({
      where: { id },
      data: { status },
    });
  }

  // BOM Conversions: query by productionUnit (for produksi module)
  async getBomConversionsByUnit(productionUnit: string) {
    return this.prisma.productBomConversion.findMany({
      where: { productionUnit },
      include: {
        product: {
          select: { id: true, name: true, unit: true, status: true, prices: true },
        },
      },
    });
  }

  // Seller warehouse profile
  async getSellerProfile(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    return profile || { userId, country: null, address: null, companyLogo: null, companyName: null, descriptions: null, profileCompanyUrl: null, profileCompanyFileName: null } as any;
  }

  async getSellerProfileById(userId: string) {
    return this.getSellerProfile(userId);
  }

  async upsertSellerProfile(userId: string, data: { country?: string; address?: string; companyLogo?: string | null; companyName?: string | null; descriptions?: string | null; profileCompanyUrl?: string | null; profileCompanyFileName?: string | null }) {
    const existing = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (existing) {
      return this.prisma.sellerProfile.update({ where: { userId }, data });
    }
    return this.prisma.sellerProfile.create({ data: { userId, ...data } });
  }

  // Shipping methods
  async listShippingMethods() {
    return [
      { code: 'AIR', label: 'Air Freight' },
      { code: 'SEA', label: 'Sea Freight (CBM/Container)' },
      { code: 'EXPRESS', label: 'Courier/Express (DHL/FedEx/UPS)' },
    ];
  }

  // Attach product images (cover + previews)
  async attachProductImages(productId: string, sellerId: string, payload: {
    cover?: { url: string; filename: string; originalName: string; size: number; mimeType: string } | null;
    previews?: Array<{ url: string; filename: string; originalName: string; size: number; mimeType: string }>;
  }) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException('Not owner of product');

    // Clear previous cover flags if a new cover provided
    if (payload.cover) {
      await this.prisma.productImage.updateMany({ where: { productId }, data: { isCover: false } });
      await this.prisma.productImage.create({
        data: {
          productId,
          url: payload.cover.url,
          filename: payload.cover.filename,
          originalName: payload.cover.originalName,
          size: Math.round(payload.cover.size),
          mimeType: payload.cover.mimeType,
          isCover: true,
        },
      });
    }

    if (payload.previews && payload.previews.length) {
      await this.prisma.productImage.createMany({
        data: payload.previews.map((p) => ({
          productId,
          url: p.url,
          filename: p.filename,
          originalName: p.originalName,
          size: Math.round(p.size),
          mimeType: p.mimeType,
          isCover: false,
        })),
        skipDuplicates: true,
      });
    }

    return this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
  }

  // Analytics: Admin (trading)
  async getAdminTradingAnalytics() {
    const [totalProducts, pendingProducts, totalOrders, byStatus, completedOrders] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: ProductStatus.PENDING } }),
      this.prisma.order.count(),
      this.prisma.order.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.order.findMany({ where: { status: OrderStatus.COMPLETED }, select: { totalPrice: true } }),
    ]);

    const ordersByStatus: Record<string, number> = {};
    for (const row of byStatus) {
      ordersByStatus[row.status] = row._count.status;
    }
    const totalRevenue = completedOrders.reduce((sum, o: any) => sum + (o.totalPrice || 0), 0);

    return { totalProducts, pendingProducts, totalOrders, ordersByStatus, totalRevenue };
  }

  // Analytics: Buyer
  async getBuyerAnalytics(buyerId: string) {
    const [totalOrders, pendingOrders, myOrders] = await Promise.all([
      this.prisma.order.count({ where: { buyerId } }),
      this.prisma.order.count({ where: { buyerId, status: OrderStatus.PENDING } }),
      this.prisma.order.findMany({ where: { buyerId }, include: { product: { select: { name: true, images: true, seller: { select: { email: true, fullname: true } } } }, shipment: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    const totalSpent = myOrders
      .filter((o) => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.SHIPPED)
      .reduce((sum, o: any) => sum + (o.totalPrice || 0), 0);
    return { totalOrders, pendingOrders, totalSpent, recentOrders: myOrders };
  }

  // Analytics: Seller
  async getSellerAnalytics(sellerId: string) {
    const [totalProducts, orders, pendingShipments] = await Promise.all([
      this.prisma.product.count({ where: { sellerId } }),
      this.prisma.order.findMany({ where: { product: { sellerId } }, include: { product: { select: { name: true } }, buyer: { select: { email: true, fullname: true } }, shipment: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.shipment.count({ where: { status: 'PENDING', order: { product: { sellerId } } } as any }),
    ]);
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status === OrderStatus.COMPLETED)
      .reduce((sum, o: any) => sum + (o.totalPrice || 0), 0);
    const recentOrders = orders.slice(0, 10);
    // Top products by number of orders and revenue
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const o of orders) {
      const pid = (o as any).productId as string;
      if (!map[pid]) map[pid] = { name: o.product?.name || 'Unknown', count: 0, revenue: 0 };
      map[pid].count += 1;
      if (o.status === OrderStatus.COMPLETED) {
        (map[pid] as any).revenue += (o as any).totalPrice || 0;
      }
    }
    const topProducts = Object.entries(map)
      .map(([id, v]) => ({ id, name: v.name, sold: v.count, revenue: v.revenue }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);

    return { totalProducts, totalOrders, totalRevenue, pendingShipments, recentOrders, topProducts };
  }
}