import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, ArusKasType, ProjectStatus, POStatus, POType, StokCategory, CashBookType, POPaymentStatus, ArusKasStatus } from '@prisma/client';

@Injectable()
export class DapurService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // PRIVATE HELPERS
  // ============================================
  private async checkDapurAccess(dapurId: string, userId: string, role: Role) {
    const dapur = await this.prisma.dapurUnit.findUnique({ where: { id: dapurId } });
    if (!dapur) throw new NotFoundException('Dapur not found');

    const isOwner = role === Role.PROJECT_OWNER && dapur.projectOwnerId === userId;
    const isPusat = role === Role.ADMIN_PUSAT && dapur.adminPusatId === userId;
    const isDapur = role === Role.ADMIN_DAPUR && dapur.adminDapurId === userId;
    const isSuper = role === Role.SUPER_ADMIN || role === Role.ADMIN;

    if (!isOwner && !isPusat && !isDapur && !isSuper) {
      throw new ForbiddenException('You do not have access to this Dapur Unit');
    }
    return dapur;
  }

  // ============================================
  // DAPUR UNIT MANAGEMENT (PO / Admin Pusat)
  // ============================================
  async createDapurUnit(userId: string, role: Role, data: { name: string; location?: string; adminPusatId?: string }) {
    if (role !== Role.PROJECT_OWNER && role !== Role.SUPER_ADMIN && role !== Role.ADMIN_PUSAT) {
      throw new ForbiddenException('Only PO or Admin Pusat can create Dapur');
    }
    
    // For PO, they can create and auto-assign
    let projectOwnerId = userId;
    if (role === Role.ADMIN_PUSAT) {
        // Find who is the PO of this Admin Pusat (could be via hierarchy, but for now we assume Admin Pusat creates on behalf of the PO that created them, or they assign)
        // Let's just set the PO to a dummy or keep track. For simplicity, if Admin Pusat creates, we need to know the PO ID.
        // Assuming Admin Pusat sends projectOwnerId in data if needed, or we fetch the first PO (since MBG might have 1 central PO).
        const po = await this.prisma.user.findFirst({ where: { role: Role.PROJECT_OWNER } });
        if (!po) throw new BadRequestException('No Project Owner found in system');
        projectOwnerId = po.id;
    }

    return this.prisma.dapurUnit.create({
      data: {
        name: data.name,
        location: data.location,
        projectOwnerId: projectOwnerId,
        adminPusatId: role === Role.ADMIN_PUSAT ? userId : data.adminPusatId,
        status: ProjectStatus.APPROVED // approved by default if created by PO/Admin Pusat
      }
    });
  }

  async assignAdminDapur(dapurId: string, userId: string, role: Role, adminDapurId: string) {
    // Auth check: ensure the dapur belongs to this user
    await this.checkDapurAccess(dapurId, userId, role);

    // Clear previous assignment so 1 Admin Dapur handles 1 Dapur Unit at most
    await this.prisma.dapurUnit.updateMany({
      where: { adminDapurId },
      data: { adminDapurId: null }
    });

    return this.prisma.dapurUnit.update({
      where: { id: dapurId },
      data: { adminDapurId }
    });
  }

  // ============================================
  // PRIVATE FUNDING & INVESTOR MANAGEMENT
  // ============================================
  async setDapurInvestors(userId: string, role: Role, dapurId: string, investorsData: { investorId: string; amount: number; profitSharingPct: number; profitSharingPctPreBEP?: number; profitSharingPctPostBEP?: number }[]) {
    // Only PO or Admin Pusat can manage investors
    if (role !== Role.PROJECT_OWNER && role !== Role.ADMIN_PUSAT) {
      throw new ForbiddenException('Unauthorized to manage investors');
    }

    // Auth check: ensure the dapur belongs to this user
    await this.checkDapurAccess(dapurId, userId, role);

    // Verify all investor IDs exist and have INVESTOR role
    for (const data of investorsData) {
      const inv = await this.prisma.user.findUnique({ where: { id: data.investorId } });
      if (!inv || inv.role !== Role.INVESTOR) {
        throw new BadRequestException(`User ${data.investorId} is not a valid investor`);
      }
    }

    // Execute in a transaction: remove old, set new
    return this.prisma.$transaction(async (tx) => {
      await tx.dapurInvestor.deleteMany({ where: { dapurUnitId: dapurId } });
      
      const newInvestors = await Promise.all(
        investorsData.map(data => 
          tx.dapurInvestor.create({
            data: {
              dapurUnitId: dapurId,
              investorId: data.investorId,
              investmentAmount: data.amount,
              profitSharingPct: data.profitSharingPct,
              profitSharingPctPreBEP: data.profitSharingPctPreBEP ?? 0,
              profitSharingPctPostBEP: data.profitSharingPctPostBEP ?? 0,
            }
          })
        )
      );
      return newInvestors;
    });
  }

  // ============================================
  // OPERATIONAL: ARUS KAS (Admin Dapur) - Manual transaction dates supported
  // ============================================
  async reportArusKas(userId: string, role: Role, dapurId: string, data: { 
    type: ArusKasType; 
    bookType: CashBookType; 
    amount: number; 
    description: string; 
    referenceNo?: string; 
    evidenceUrl?: string; 
    transactionDate?: string;
    items?: { name: string; quantity: number; unit?: string; pricePerUnit?: number; total?: number }[];
  }) {
    // Audit check
    await this.checkDapurAccess(dapurId, userId, role);

    // General Cash (UMUM) needs approval. Petty Cash (PEMBANTU) is auto-approved.
    const status = data.bookType === CashBookType.UMUM ? ArusKasStatus.PENDING : ArusKasStatus.APPROVED;

    return this.prisma.arusKas.create({
      data: {
        dapurUnitId: dapurId,
        type: data.type,
        bookType: data.bookType,
        amount: data.amount,
        description: data.description,
        referenceNo: data.referenceNo,
        evidenceUrl: data.evidenceUrl,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        status,
        reportedById: userId,
        items: data.items ? {
          create: data.items.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            pricePerUnit: i.pricePerUnit,
            total: i.total || (i.quantity * (i.pricePerUnit || 0))
          }))
        } : undefined
      },
      include: {
        items: true,
        reportedBy: { select: { fullname: true, email: true } }
      }
    });
  }
  async getArusKas(dapurId: string, userId: string, role: Role, bookType?: any) {
    // Auth check
    const dapur = await this.prisma.dapurUnit.findUnique({ where: { id: dapurId } });
    if (!dapur) throw new NotFoundException('Dapur not found');

    const isOwner = role === Role.PROJECT_OWNER && dapur.projectOwnerId === userId;
    const isPusat = role === Role.ADMIN_PUSAT && dapur.adminPusatId === userId;
    const isDapur = role === Role.ADMIN_DAPUR && dapur.adminDapurId === userId;
    const isSuper = role === Role.SUPER_ADMIN || role === Role.ADMIN;

    if (!isOwner && !isPusat && !isDapur && !isSuper) {
      throw new ForbiddenException('Not authorized to view this Dapur Arus Kas');
    }

    let arusKas = await this.prisma.arusKas.findMany({
      where: { 
        dapurUnitId: dapurId,
        ...(bookType && { bookType })
      },
      include: {
        reportedBy: { select: { fullname: true, email: true } },
        approvedBy: { select: { fullname: true, email: true } },
      },
      orderBy: { transactionDate: 'desc' }
    });

    // Filter sensitive data for roles other than ADMIN_PUSAT, SUPER_ADMIN, and ADMIN
    const isPowerUser = role === Role.ADMIN_PUSAT || role === Role.SUPER_ADMIN || role === Role.ADMIN;
    if (!isPowerUser) {
      const sensitiveKeywords = [
        'Komitmen ke Yayasan',
        'Insentif kepala SPPG',
        'Insentif Akuntan SPPG',
        'Insentif Ahli Gizi'
      ];
      
      arusKas = arusKas.filter(item => {
        const desc = item.description || '';
        return !sensitiveKeywords.some(keyword => desc.toLowerCase().includes(keyword.toLowerCase()));
      });
    }

    return arusKas;
  }

  async approveArusKas(adminPusatId: string, id: string) {
    // Audit check: ensure the unit belongs to this admin or they are super?
    // For now simple ID update
    return this.prisma.arusKas.update({
      where: { id },
      data: {
        status: ArusKasStatus.APPROVED,
        approvedById: adminPusatId
      }
    });
  }

  async rejectArusKas(adminPusatId: string, id: string) {
    return this.prisma.arusKas.update({
      where: { id },
      data: {
        status: ArusKasStatus.REJECTED,
        approvedById: adminPusatId
      }
    });
  }

  // ============================================
  // OPERATIONAL: STOK (Admin Dapur)
  // ============================================
  async updateStok(adminDapurId: string, dapurId: string, data: { itemName: string; quantity: number; unit: string }) {
    const dapur = await this.prisma.dapurUnit.findFirst({
      where: { id: dapurId, adminDapurId }
    });
    if (!dapur) throw new ForbiddenException('You are not assigned to this Dapur Unit');

    // Upsert mechanism based on itemName in that specific Dapur Unit
    const existingStok = await this.prisma.stok.findFirst({
      where: { dapurUnitId: dapurId, itemName: data.itemName }
    });

    if (existingStok) {
      return this.prisma.stok.update({
        where: { id: existingStok.id },
        data: {
          quantity: data.quantity, // Overwrite or add based on business logic. Here we just overwrite as explicit update
          unit: data.unit,
          lastUpdatedById: adminDapurId
        }
      });
    } else {
      return this.prisma.stok.create({
        data: {
          dapurUnitId: dapurId,
          itemName: data.itemName,
          quantity: data.quantity,
          unit: data.unit,
          lastUpdatedById: adminDapurId
        }
      });
    }
  }

  // ============================================
  // INTERNAL SUPPLY CHAIN: PURCHASE ORDERS (PO)
  // ============================================
  async createPurchaseOrder(adminDapurId: string, dapurId: string, items: { productName: string; quantity: number; unit?: string; supplierName?: string; pricePerUnit?: number }[], type: POType = POType.BAHAN) {
    // 1. Verify ownership
    const dapur = await this.prisma.dapurUnit.findFirst({
      where: { id: dapurId, adminDapurId }
    });
    if (!dapur) throw new ForbiddenException('Not your dapur');

    // 2. Create PO with pending status
    return this.prisma.purchaseOrder.create({
      data: {
        dapurUnitId: dapurId,
        createdById: adminDapurId,
        status: POStatus.PENDING,
        type: type,
        paymentStatus: POPaymentStatus.UNPAID,
        items: {
          create: items.map(item => ({
            productName: item.productName,
            supplierName: item.supplierName,
            unit: item.unit || "Gram",
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit || 0,
          }))
        }
      },
      include: { items: true }
    });
  }

  async payPurchaseOrder(adminDapurId: string, poId: string, bookType: CashBookType, evidenceData?: { referenceNo?: string; evidenceUrl?: string; transactionDate?: Date }) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true, dapurUnit: true }
    });

    if (!po) throw new NotFoundException('Purchase Order not found');
    if (po.dapurUnit.adminDapurId !== adminDapurId) throw new ForbiddenException('Not your Dapur PO');
    if (po.paymentStatus === POPaymentStatus.PAID) throw new BadRequestException('PO is already paid');

    // Calculate total amount
    const totalAmount = po.items.reduce((acc, item) => acc + (item.quantity * (item.pricePerUnit || 0)), 0);
    if (totalAmount <= 0) throw new BadRequestException('Total amount must be greater than 0');

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create ArusKas entry (OUT) - Always PENDING because it's an Invoice Payment
      const kas = await tx.arusKas.create({
        data: {
          dapurUnitId: po.dapurUnitId,
          type: ArusKasType.OUT,
          bookType: bookType,
          amount: totalAmount,
          description: `Pembayaran Invoice PO #${po.id.slice(0,8)} - ${po.items[0]?.productName || 'Barang'}`,
          referenceNo: evidenceData?.referenceNo,
          evidenceUrl: evidenceData?.evidenceUrl,
          transactionDate: evidenceData?.transactionDate ? new Date(evidenceData.transactionDate) : new Date(),
          status: ArusKasStatus.PENDING,
          reportedById: adminDapurId
        }
      });

      // 2. Update PO status
      return tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          paymentStatus: POPaymentStatus.PAID,
          paymentDate: new Date(),
          arusKasId: kas.id
        }
      });
    });
  }

  async transferArusKas(adminDapurId: string, dapurId: string, data: { amount: number; fromBook: CashBookType; toBook: CashBookType; description: string; transactionDate?: Date }) {
    const dapur = await this.prisma.dapurUnit.findFirst({
      where: { id: dapurId, adminDapurId }
    });
    if (!dapur) throw new ForbiddenException('Not your Dapur Unit');

    if (data.fromBook === data.toBook) throw new BadRequestException('Cannot transfer to the same book');

    const tDate = data.transactionDate ? new Date(data.transactionDate) : new Date();

    return await this.prisma.$transaction(async (tx) => {
      // 1. Record OUT from source book
      await tx.arusKas.create({
        data: {
          dapurUnitId: dapurId,
          type: ArusKasType.OUT,
          bookType: data.fromBook,
          amount: data.amount,
          description: `Transfer ke ${data.toBook === CashBookType.UMUM ? 'Kas Umum' : 'Kas Pembantu'}: ${data.description}`,
          transactionDate: tDate,
          category: 'INTERNAL_TRANSFER',
          reportedById: adminDapurId
        }
      });

      // 2. Record IN to destination book
      return tx.arusKas.create({
        data: {
          dapurUnitId: dapurId,
          type: ArusKasType.IN,
          bookType: data.toBook,
          amount: data.amount,
          description: `Terima dari ${data.fromBook === CashBookType.UMUM ? 'Kas Umum' : 'Kas Pembantu'}: ${data.description}`,
          transactionDate: tDate,
          category: 'INTERNAL_TRANSFER',
          reportedById: adminDapurId
        }
      });
    });
  }

  async updatePurchaseOrderItems(userId: string, poId: string, items: { id: string, productName: string; quantity: number; unit?: string; supplierName?: string; pricePerUnit?: number }[]) {
     const po = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } });
     if (!po) throw new NotFoundException('PO not found');
     if (po.status !== POStatus.PENDING) throw new ForbiddenException('Cannot edit non-pending PO');

     // We update the items directly
     const updatePromises = items.map(item => this.prisma.pOItem.update({
        where: { id: item.id },
        data: {
           productName: item.productName,
           quantity: item.quantity,
           unit: item.unit,
           supplierName: item.supplierName,
           pricePerUnit: item.pricePerUnit
        }
     }));
     return this.prisma.$transaction(updatePromises);
  }

  async approvePO(adminPusatId: string, poId: string, statuses: POStatus) {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: statuses,
        approvedById: adminPusatId
      }
    });
  }
  
  async sendPOToSupplier(userId: string, poId: string, supplierName: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
       where: { id: poId },
       include: { items: true }
    });
    if (!po) throw new NotFoundException('PO not found');
    if (po.status !== POStatus.APPROVED && po.status !== POStatus.ORDERED) {
       throw new ForbiddenException('PO must be approved first');
    }

    // Mark items from this supplier as ordered
    await this.prisma.pOItem.updateMany({
       where: { purchaseOrderId: poId, supplierName: supplierName },
       data: { isOrdered: true }
    });

    // Check if everything is now ordered
    const items = await this.prisma.pOItem.findMany({ where: { purchaseOrderId: poId } });
    const allOrdered = items.every(i => i.isOrdered);
    if (allOrdered && po.status !== POStatus.ORDERED) {
       await this.prisma.purchaseOrder.update({
          where: { id: poId },
          data: { status: POStatus.ORDERED }
       });
    }

    return { allOrdered };
  }

  async getAllPurchaseOrders(userId: string, role: Role) {
    let whereClause: any = null;
    if (role === Role.ADMIN_PUSAT) {
       whereClause = { dapurUnit: { adminPusatId: userId } };
    } else if (role === Role.ADMIN_DAPUR) {
       whereClause = { dapurUnit: { adminDapurId: userId } };
    } else if (role === Role.PROJECT_OWNER) {
       whereClause = { dapurUnit: { projectOwnerId: userId } };
    } else if (role === Role.SUPER_ADMIN || role === Role.ADMIN) {
       whereClause = {};
    }

    if (whereClause === null) return [];
    
    return this.prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        dapurUnit: true,
        items: true,
        createdBy: { select: { fullname: true, email: true } },
        approvedBy: { select: { fullname: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // VISIBILITY (BIRD'S EYE VIEW)
  // ============================================
  async getDapurList(userId: string, role: Role) {
    const sensitiveKeywords = [
      'Komitmen ke Yayasan',
      'Insentif kepala SPPG',
      'Insentif Akuntan SPPG',
      'Insentif Ahli Gizi'
    ];

    if (role === Role.ADMIN_DAPUR) {
      const units = await this.prisma.dapurUnit.findMany({
        where: { adminDapurId: userId },
        include: { 
          investors: true,
          arusKas: {
            include: { reportedBy: { select: { fullname: true, email: true } } },
            orderBy: { transactionDate: 'desc' }
          }
        }
      });

      // Filter sensitive arus kas for Admin Dapur
      return units.map(unit => ({
        ...unit,
        arusKas: unit.arusKas.filter(item => {
          const desc = item.description || '';
          return !sensitiveKeywords.some(keyword => desc.toLowerCase().includes(keyword.toLowerCase()));
        })
      }));
    } else if (role === Role.ADMIN_PUSAT) {
      return this.prisma.dapurUnit.findMany({
        where: { adminPusatId: userId },
        include: { 
          investors: {
            include: { investor: { select: { id: true, fullname: true, email: true } } }
          }, 
          arusKas: { 
            include: { 
              reportedBy: { select: { fullname: true, email: true } }, 
              approvedBy: { select: { fullname: true, email: true } },
              items: true,
              purchaseOrder: { include: { items: true } }
            },
            orderBy: { transactionDate: 'desc' }
          }, 
          purchaseOrders: true,
          adminDapur: { select: { id: true, fullname: true, email: true } },
          adminPusat: { select: { id: true, fullname: true, email: true } }
        }
      });
    } else if (role === Role.PROJECT_OWNER) {
      const units = await this.prisma.dapurUnit.findMany({
        where: { projectOwnerId: userId },
        include: { 
          investors: {
            include: { investor: { select: { id: true, fullname: true, email: true } } }
          }, 
          arusKas: {
            include: { 
              reportedBy: { select: { fullname: true, email: true } }, 
              approvedBy: { select: { fullname: true, email: true } },
              items: true,
              purchaseOrder: { include: { items: true } }
            },
            orderBy: { transactionDate: 'desc' }
          }, 
          purchaseOrders: true,
          adminDapur: { select: { id: true, fullname: true, email: true } },
          adminPusat: { select: { id: true, fullname: true, email: true } }
        }
      });

      // Filter sensitive arus kas for Project Owner too? 
      // User said: "hanya tampil di admin pusat namun di admin dapur di hide"
      // Usually PO shouldn't see these internal incentives either if not specified.
      // But the prompt specifically mentioned Admin Dapur.
      // I'll filter for everyone EXCEPT Admin Pusat and Super Admin to be safe.
      return units.map(unit => ({
        ...unit,
        arusKas: unit.arusKas.filter(item => {
          const desc = item.description || '';
          return !sensitiveKeywords.some(keyword => desc.toLowerCase().includes(keyword.toLowerCase()));
        })
      }));
    } else if (role === Role.INVESTOR) {
      // Find DAPUR where this investor has a stake
      const stakes = await this.prisma.dapurInvestor.findMany({
        where: { investorId: userId },
        include: { 
          dapurUnit: {
            include: {
              arusKas: {
                orderBy: { transactionDate: 'desc' }
              }
            }
          }
        }
      });
      
      // Filter sensitive arus kas for Investor
      return stakes.map(stake => ({
        ...stake,
        dapurUnit: {
          ...stake.dapurUnit,
          arusKas: stake.dapurUnit.arusKas.filter(item => {
            const desc = item.description || '';
            return !sensitiveKeywords.some(keyword => desc.toLowerCase().includes(keyword.toLowerCase()));
          })
        }
      }));
    }
    
    // Only SUPER_ADMIN and ADMIN get all
    if (role === Role.SUPER_ADMIN || role === Role.ADMIN) {
      return this.prisma.dapurUnit.findMany({
        include: { 
          investors: true, 
          arusKas: {
            include: { reportedBy: { select: { fullname: true, email: true } } },
            orderBy: { transactionDate: 'desc' }
          }
        }
      });
    }

    // Default to empty for other roles not explicitly handled
    return [];
  }

  async getMyDapurUnit(userId: string, role?: Role) {
    if (role === Role.ADMIN_PUSAT) {
      return this.prisma.dapurUnit.findFirst({
        where: { adminPusatId: userId }
      });
    }
    if (role === Role.PROJECT_OWNER) {
      return this.prisma.dapurUnit.findFirst({
        where: { projectOwnerId: userId }
      });
    }
    return this.prisma.dapurUnit.findFirst({
      where: { adminDapurId: userId }
    });
  }

  async updateDapurBranding(dapurId: string, userId: string, role: Role, data: any) {
    const dapur = await this.prisma.dapurUnit.findUnique({ where: { id: dapurId } });
    if (!dapur) throw new NotFoundException('Dapur not found');
    
    // Auth check
    const isOwner = role === Role.PROJECT_OWNER && dapur.projectOwnerId === userId;
    const isPusat = role === Role.ADMIN_PUSAT && dapur.adminPusatId === userId;
    const isDapur = role === Role.ADMIN_DAPUR && dapur.adminDapurId === userId;
    const isSuper = role === Role.SUPER_ADMIN;

    if (!isOwner && !isPusat && !isDapur && !isSuper) {
      throw new ForbiddenException('Not authorized to update this Dapur branding');
    }
    
    return this.prisma.dapurUnit.update({
      where: { id: dapurId },
      data: {
        logoUrl: data.logoUrl,
        fullAddress: data.fullAddress,
        signatureUrl: data.signatureUrl,
        adminDapurName: data.adminDapurName,
        name: data.name
      }
    });
  }

  // ============================================
  // LOADING GOODS / RECEIVED PO (Stok)
  // ============================================

  async getPendingReceptionPOs(adminDapurId: string) {
    // Get Dapur unit of this admin
    const unit = await this.prisma.dapurUnit.findFirst({ where: { adminDapurId } });
    if (!unit) return [];

    // Find POs that are ORDERED but not fully received? 
    // For now, any ORDERED PO can be "Loading"
    return this.prisma.purchaseOrder.findMany({
      where: {
        dapurUnitId: unit.id,
        status: POStatus.ORDERED
      },
      include: {
        items: true,
        loadingGoods: { include: { items: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async receivePurchaseOrder(adminDapurId: string, poId: string, data: {
    notes?: string;
    items: {
      poItemId: string;
      quantityReceived: number;
      quantityRejected: number;
      quantityReturned: number;
      qualityCheck?: string;
      notes?: string;
    }[]
  }) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { dapurUnit: true, items: true }
    });

    if (!po) throw new NotFoundException('Purchase Order not found');
    if (po.dapurUnit.adminDapurId !== adminDapurId) throw new ForbiddenException('Not your Dapur PO');
    if (po.status !== POStatus.ORDERED && po.status !== POStatus.DELIVERED) {
      throw new BadRequestException('PO must be in ORDERED state to receive it');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create LoadingGood record
      const loading = await tx.loadingGood.create({
        data: {
          purchaseOrderId: poId,
          receivedById: adminDapurId,
          notes: data.notes
        }
      });

      // 2. Process Items
      for (const itemData of data.items) {
        const poItem = po.items.find(i => i.id === itemData.poItemId);
        if (!poItem) continue;

        // Create LoadingGoodItem
        await tx.loadingGoodItem.create({
          data: {
            loadingGoodId: loading.id,
            poItemId: itemData.poItemId,
            quantityReceived: itemData.quantityReceived,
            quantityRejected: itemData.quantityRejected,
            quantityReturned: itemData.quantityReturned,
            qualityCheck: itemData.qualityCheck,
            notes: itemData.notes
          }
        });

        // 3. Update Stok (Dapur Inventory)
        // Net delta = yang masuk gudang layak pakai: diterima − rusak (reject) − retur ke supplier.
        // Bisa negatif pada penerimaan lanjutan (koreksi retur/reject saja) → stok berkurang.
        const qtyReceived = Number(itemData.quantityReceived) || 0;
        const qtyRejected = Number(itemData.quantityRejected) || 0;
        const qtyReturned = Number(itemData.quantityReturned) || 0;
        const netDelta = qtyReceived - qtyRejected - qtyReturned;
        const stockCategory = po.type === POType.MANUAL ? StokCategory.LAIN : StokCategory.BAHAN;
        const itemName = poItem.productName || "";

        if (Math.abs(netDelta) < 1e-9) {
          continue;
        }

        const existingStok = await tx.stok.findFirst({
          where: { dapurUnitId: po.dapurUnitId, itemName, category: stockCategory },
        });

        if (existingStok) {
          const projected = existingStok.quantity + netDelta;
          if (projected < -1e-9) {
            throw new BadRequestException(
              `Stok "${itemName}" tidak cukup untuk pengurangan retur/reject. Stok saat ini: ${existingStok.quantity}, perubahan bersih: ${netDelta}`,
            );
          }
          await tx.stok.update({
            where: { id: existingStok.id },
            data: {
              quantity: { increment: netDelta },
              lastUpdatedById: adminDapurId,
            },
          });
        } else {
          if (netDelta < 0) {
            throw new BadRequestException(
              `Tidak dapat mengurangi stok untuk "${itemName}": item belum ada di gudang (lakukan penerimaan positif terlebih dahulu).`,
            );
          }
          await tx.stok.create({
            data: {
              dapurUnitId: po.dapurUnitId,
              itemName,
              quantity: netDelta,
              unit: poItem.unit || 'Gram',
              category: stockCategory,
              lastUpdatedById: adminDapurId,
            },
          });
        }
      }

      // 4. Update PO Status to DELIVERED if it's the first loading (or update overall)
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: POStatus.DELIVERED }
      });

      return loading;
    });
  }

  async getStok(adminDapurId: string, category?: string) {
    const unit = await this.prisma.dapurUnit.findFirst({ where: { adminDapurId } });
    if (!unit) return [];
    
    return this.prisma.stok.findMany({
      where: { 
        dapurUnitId: unit.id,
        ...(category && { category: category as any })
      },
      orderBy: { itemName: 'asc' }
    });
  }

  async getLoadingGoodsHistory(adminDapurId: string) {
    const unit = await this.prisma.dapurUnit.findFirst({ where: { adminDapurId } });
    if (!unit) return [];

    return this.prisma.loadingGood.findMany({
      where: { purchaseOrder: { dapurUnitId: unit.id } },
      include: {
        purchaseOrder: true,
        items: { include: { poItem: true } },
        receivedBy: { select: { fullname: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ============================================================
  // DAPUR DIVIDEND — Laporan Bagi Hasil oleh Admin Pusat
  // ============================================================

  /**
   * Admin Pusat melaporkan laba/bagi hasil untuk suatu Dapur.
   * Sistem otomatis mendistribusikan ke setiap investor sesuai profitSharingPct-nya.
   */
  async reportDapurDividend(
    reportedById: string,
    dapurId: string,
    data: {
      totalAmount: number;
      period?: string;
      description?: string;
    }
  ) {
    // 1. Pastikan dapur ada
    const dapur = await this.prisma.dapurUnit.findUnique({
      where: { id: dapurId },
      include: {
        investors: {
          include: { investor: { select: { id: true, fullname: true, email: true } } }
        }
      }
    });
    if (!dapur) throw new NotFoundException('Dapur not found');
    if (dapur.investors.length === 0)
      throw new BadRequestException('Tidak ada investor yang terdaftar di dapur ini');

    // 2. Buat record DapurDividend dan distribusinya dalam satu transaksi
    return this.prisma.$transaction(async (tx) => {
      const dividend = await tx.dapurDividend.create({
        data: {
          dapurUnitId: dapurId,
          totalAmount: data.totalAmount,
          period: data.period,
          description: data.description,
          reportedById,
        }
      });

      // Distribusi ke setiap investor berdasarkan profitSharingPct mereka
      const distributions = await Promise.all(
        dapur.investors.map(async (stake) => {
          // Gunakan profitSharingPct sebagai persentase bagi hasil investor ini
          const pct = stake.profitSharingPct;
          const amount = data.totalAmount * (pct / 100);
          return tx.dapurDividendDistribution.create({
            data: {
              dividendId: dividend.id,
              investorId: stake.investorId,
              amount,
              percentage: pct,
            }
          });
        })
      );

      return {
        ...dividend,
        distributions,
        distributionsCount: distributions.length,
        totalDistributed: distributions.reduce((s, d) => s + d.amount, 0),
      };
    });
  }

  /**
   * Daftar laporan bagi hasil untuk suatu Dapur (untuk admin pusat / project owner)
   */
  async getDapurDividends(dapurId: string) {
    return this.prisma.dapurDividend.findMany({
      where: { dapurUnitId: dapurId },
      include: {
        reportedBy: { select: { id: true, fullname: true, email: true } },
        distributions: {
          include: {
            investor: { select: { id: true, fullname: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Mencatat cashback dari supplier untuk suatu Dapur Unit.
   */
  async reportCashback(
    reportedById: string,
    role: Role,
    dapurId: string,
    data: {
      amount: number;
      supplierName?: string;
      purchaseOrderId?: string;
      description?: string;
      transactionDate?: string;
    }
  ) {
    if (role !== Role.ADMIN_PUSAT && role !== Role.SUPER_ADMIN && role !== Role.ADMIN) {
      throw new ForbiddenException('Akses ditolak: Hanya Admin Pusat yang bisa mencatat cashback');
    }

    const tDate = data.transactionDate ? new Date(data.transactionDate) : new Date();

    return this.prisma.dapurCashback.create({
      data: {
        dapurUnitId: dapurId,
        amount: data.amount,
        supplierName: data.supplierName,
        purchaseOrderId: data.purchaseOrderId,
        description: data.description,
        transactionDate: tDate,
        reportedById,
      },
      include: {
        dapurUnit: { select: { name: true } },
        reportedBy: { select: { fullname: true, email: true } },
      }
    });
  }

  /**
   * Mengambil riwayat cashback untuk suatu Dapur Unit.
   */
  async getCashbackHistory(role: Role, dapurId: string) {
    if (role !== Role.ADMIN_PUSAT && role !== Role.SUPER_ADMIN && role !== Role.ADMIN) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki izin untuk melihat laporan cashback');
    }

    return this.prisma.dapurCashback.findMany({
      where: { dapurUnitId: dapurId },
      include: {
        reportedBy: { select: { id: true, fullname: true, email: true } },
        purchaseOrder: { select: { id: true, createdAt: true } },
      },
      orderBy: { transactionDate: 'desc' },
    });
  }
}
