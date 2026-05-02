import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, ArusKasType, ProjectStatus, POStatus, POType, StokCategory, CashBookType, POPaymentStatus, ArusKasStatus } from '@prisma/client';
import { asArusKasPoRow, asArusKasUpdate } from './arus-kas-po-workflow';

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

  /** Resolves the dapur unit id for ops (stok, PO loading, my-unit) including tim via shared `User.subscriptionId` → `Subscription.dapurUnitId`. */
  private async resolveDapurUnitIdForUser(userId: string, role?: Role): Promise<string | null> {
    if (role === Role.ADMIN_PUSAT) {
      const unit = await this.prisma.dapurUnit.findFirst({
        where: { adminPusatId: userId },
        select: { id: true },
      });
      return unit?.id ?? null;
    }
    if (role === Role.PROJECT_OWNER) {
      const unit = await this.prisma.dapurUnit.findFirst({
        where: { projectOwnerId: userId },
        select: { id: true },
      });
      return unit?.id ?? null;
    }
    if (role === Role.ADMIN_DAPUR) {
      const unit = await this.prisma.dapurUnit.findFirst({
        where: { adminDapurId: userId },
        select: { id: true },
      });
      return unit?.id ?? null;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionId: true },
    });
    if (!user?.subscriptionId) return null;
    const sub = await this.prisma.subscription.findUnique({
      where: { id: user.subscriptionId },
      select: { dapurUnitId: true },
    });
    return sub?.dapurUnitId ?? null;
  }

  /** Prisma/DB belum dimigrasi (kolom ArusKas baru) → 400 agar bukan 500 polos. */
  private rethrowPrismaMigrationHint(err: unknown): never {
    const pe = err as { code?: string; message?: string };
    const m = String(pe?.message ?? err ?? '');
    if (
      pe?.code === 'P2022' ||
      /\bcolumn\b.*\bdoes not exist\b/i.test(m) ||
      (m.includes('pendingPoApproval') && /\bdoes not exist\b/i.test(m)) ||
      (m.includes('markedForDeletion') && /\bdoes not exist\b/i.test(m)) ||
      (m.includes('pendingEditData') && /\bdoes not exist\b/i.test(m))
    ) {
      throw new BadRequestException(
        'Skema database belum diperbarui. Di server, pada folder backend, jalankan: npx prisma migrate deploy (pastikan DATABASE_URL benar).',
      );
    }
    throw err;
  }

  private async generateReferenceNo(transactionDate: Date, tx: any = this.prisma): Promise<string> {
    const year = transactionDate.getFullYear();
    const month = transactionDate.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    const yearMonthPrefix = `TRX-${year}${monthStr}-`;

    const latestKas = await tx.arusKas.findFirst({
      where: {
        referenceNo: {
          startsWith: yearMonthPrefix
        }
      },
      orderBy: {
        referenceNo: 'desc'
      }
    });

    let nextNumber = 1;
    if (latestKas && latestKas.referenceNo) {
      const parts = latestKas.referenceNo.split('-');
      if (parts.length === 3) {
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      } else {
        // Just in case there is a trailing string like (REF)
        const possibleNum = parseInt(parts[2]?.split(' ')[0], 10);
        if (!isNaN(possibleNum)) {
          nextNumber = possibleNum + 1;
        }
      }
    }

    return `${yearMonthPrefix}${nextNumber.toString().padStart(4, '0')}`;
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

  async updateDapurUnit(userId: string, role: Role, dapurId: string, data: { name?: string; location?: string }) {
    if (role !== Role.PROJECT_OWNER && role !== Role.SUPER_ADMIN && role !== Role.ADMIN_PUSAT) {
      throw new ForbiddenException('Only PO or Admin Pusat can edit Dapur');
    }
    await this.checkDapurAccess(dapurId, userId, role);
    return this.prisma.dapurUnit.update({
      where: { id: dapurId },
      data: {
        name: data.name,
        location: data.location,
      }
    });
  }

  async deleteDapurUnit(userId: string, role: Role, dapurId: string) {
    if (role !== Role.PROJECT_OWNER && role !== Role.SUPER_ADMIN && role !== Role.ADMIN_PUSAT) {
      throw new ForbiddenException('Only PO or Admin Pusat can delete Dapur');
    }
    await this.checkDapurAccess(dapurId, userId, role);

    const hasTransactions = await this.prisma.arusKas.findFirst({ where: { dapurUnitId: dapurId } });
    if (hasTransactions) {
      throw new BadRequestException('Tidak bisa menghapus Dapur yang sudah memiliki transaksi Arus Kas.');
    }
    const hasPo = await this.prisma.purchaseOrder.findFirst({ where: { dapurUnitId: dapurId } });
    if (hasPo) {
      throw new BadRequestException('Tidak bisa menghapus Dapur yang sudah memiliki Purchase Order.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.dapurInvestor.deleteMany({ where: { dapurUnitId: dapurId } });
        await tx.labelDapur.deleteMany({ where: { dapurUnitId: dapurId } });
        return await tx.dapurUnit.delete({ where: { id: dapurId } });
      });
    } catch (error) {
      throw new BadRequestException('Gagal menghapus Dapur. Pastikan dapur tidak terikat dengan data operasional.');
    }
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
    const txDate = data.transactionDate ? new Date(data.transactionDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const generatedRefNo = await this.generateReferenceNo(txDate, tx);
      const referenceToSave = data.referenceNo ? `${generatedRefNo} (${data.referenceNo})` : generatedRefNo;

      return tx.arusKas.create({
        data: {
          dapurUnitId: dapurId,
          type: data.type,
          bookType: data.bookType,
          amount: data.amount,
          description: data.description,
          referenceNo: referenceToSave,
          evidenceUrl: data.evidenceUrl,
          transactionDate: txDate,
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
        items: true,
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

  /** Admin Pusat mengajukan perubahan pada transaksi APPROVED; Project Owner menyetujui di endpoint approve. */
  async adminPusatProposeArusKasEdit(
    adminPusatId: string,
    arusKasId: string,
    data: {
      type: ArusKasType;
      bookType: CashBookType;
      amount: number;
      description: string;
      referenceNo?: string;
      evidenceUrl?: string;
      transactionDate?: string;
      items?: { name: string; quantity: number; unit?: string; pricePerUnit?: number; total?: number }[];
    },
  ) {
    const row = asArusKasPoRow(
      await this.prisma.arusKas.findUnique({
        where: { id: arusKasId },
        include: { dapurUnit: true },
      }),
    );
    if (!row?.dapurUnit) throw new NotFoundException('Transaksi tidak ditemukan');
    if (row.dapurUnit.adminPusatId !== adminPusatId) {
      throw new ForbiddenException('Anda tidak mengelola unit dapur ini');
    }
    if (row.status !== ArusKasStatus.APPROVED) {
      throw new BadRequestException('Hanya transaksi berstatus disetujui yang dapat diajukan perubahan');
    }
    if (row.pendingPoApproval) {
      throw new BadRequestException('Sudah ada pengajuan yang menunggu persetujuan Project Owner');
    }

    const txDate = data.transactionDate ? new Date(data.transactionDate) : row.transactionDate;
    const payload = {
      type: data.type,
      bookType: data.bookType,
      amount: Number(data.amount),
      description: data.description,
      referenceNo: data.referenceNo ?? null,
      evidenceUrl: data.evidenceUrl ?? null,
      transactionDate: txDate.toISOString(),
      items: data.items ?? [],
    };

    return this.prisma.arusKas.update({
      where: { id: arusKasId },
      data: asArusKasUpdate({
        pendingPoApproval: true,
        markedForDeletion: false,
        pendingEditData: payload as unknown as Prisma.InputJsonValue,
      }),
      include: {
        reportedBy: { select: { fullname: true, email: true } },
        approvedBy: { select: { fullname: true, email: true } },
        items: true,
      },
    });
  }

  async adminPusatRequestDeleteArusKas(adminPusatId: string, arusKasId: string) {
    const row = asArusKasPoRow(
      await this.prisma.arusKas.findUnique({
        where: { id: arusKasId },
        include: { dapurUnit: true },
      }),
    );
    if (!row?.dapurUnit) throw new NotFoundException('Transaksi tidak ditemukan');
    if (row.dapurUnit.adminPusatId !== adminPusatId) {
      throw new ForbiddenException('Anda tidak mengelola unit dapur ini');
    }
    if (row.status !== ArusKasStatus.APPROVED) {
      throw new BadRequestException('Hanya transaksi berstatus disetujui yang dapat diajukan penghapusan');
    }
    if (row.pendingPoApproval) {
      throw new BadRequestException('Sudah ada pengajuan yang menunggu persetujuan Project Owner');
    }

    const poLink = await this.prisma.purchaseOrder.findFirst({ where: { arusKasId } });
    if (poLink) {
      throw new BadRequestException(
        'Transaksi terhubung ke Purchase Order pembayaran; hapus tidak dapat diajukan.',
      );
    }

    return this.prisma.arusKas.update({
      where: { id: arusKasId },
      data: asArusKasUpdate({
        pendingPoApproval: true,
        markedForDeletion: true,
        pendingEditData: Prisma.JsonNull,
      }),
      include: {
        reportedBy: { select: { fullname: true, email: true } },
        approvedBy: { select: { fullname: true, email: true } },
        items: true,
      },
    });
  }

  async approveArusKas(userId: string, role: Role, id: string) {
    const row = asArusKasPoRow(
      await this.prisma.arusKas.findUnique({
        where: { id },
        include: { dapurUnit: true, items: true },
      }),
    );
    if (!row?.dapurUnit) throw new NotFoundException('Transaksi tidak ditemukan');

    const dapur = row.dapurUnit;
    const isSuper = role === Role.SUPER_ADMIN || role === Role.ADMIN;

    // ── Pengajuan ubah/hapus oleh Admin Pusat → Project Owner (atau Super Admin)
    if (row.pendingPoApproval) {
      const canPo = role === Role.PROJECT_OWNER && dapur.projectOwnerId === userId;
      if (!canPo && !isSuper) {
        throw new ForbiddenException(
          'Pengajuan perubahan atau penghapusan dari Admin Pusat hanya dapat disetujui oleh Project Owner',
        );
      }

      if (row.markedForDeletion) {
        const poLink = await this.prisma.purchaseOrder.findFirst({ where: { arusKasId: id } });
        if (poLink) {
          throw new BadRequestException('Transaksi masih terhubung ke PO.');
        }
        await this.prisma.arusKasItem.deleteMany({ where: { arusKasId: id } });
        await this.prisma.arusKas.delete({ where: { id } });
        return { deleted: true, id };
      }

      const raw = row.pendingEditData as Record<string, unknown> | null;
      if (!raw || typeof raw !== 'object') {
        throw new BadRequestException('Data pengajuan tidak valid');
      }

      const txDate =
        typeof raw.transactionDate === 'string'
          ? new Date(raw.transactionDate)
          : row.transactionDate;

      await this.prisma.$transaction(async (tx) => {
        await tx.arusKasItem.deleteMany({ where: { arusKasId: id } });
        const items = Array.isArray(raw.items) ? raw.items : [];
        await tx.arusKas.update({
          where: { id },
          data: asArusKasUpdate({
            type: raw.type as ArusKasType,
            bookType: raw.bookType as CashBookType,
            amount: Number(raw.amount),
            description: String(raw.description ?? ''),
            referenceNo:
              raw.referenceNo === null || raw.referenceNo === undefined
                ? null
                : String(raw.referenceNo),
            evidenceUrl:
              raw.evidenceUrl === null || raw.evidenceUrl === undefined
                ? null
                : String(raw.evidenceUrl),
            transactionDate: txDate,
            status: ArusKasStatus.APPROVED,
            approvedById: userId,
            pendingPoApproval: false,
            markedForDeletion: false,
            pendingEditData: Prisma.JsonNull,
          }),
        });
        if (items.length > 0) {
          await tx.arusKasItem.createMany({
            data: items.map((i: any) => ({
              arusKasId: id,
              name: String(i.name ?? ''),
              quantity: Number(i.quantity) || 0,
              unit: i.unit != null ? String(i.unit) : null,
              pricePerUnit: i.pricePerUnit != null ? Number(i.pricePerUnit) : null,
              total: i.total != null ? Number(i.total) : 0,
            })),
          });
        }
      });

      return this.prisma.arusKas.findUnique({
        where: { id },
        include: {
          items: true,
          reportedBy: { select: { fullname: true, email: true } },
          approvedBy: { select: { fullname: true, email: true } },
        },
      });
    }

    // ── Persetujuan awal (laporan Admin Dapur): Admin Pusat atau Project Owner
    const isPusat = role === Role.ADMIN_PUSAT && dapur.adminPusatId === userId;
    const isPo = role === Role.PROJECT_OWNER && dapur.projectOwnerId === userId;
    if (!isPusat && !isPo && !isSuper) {
      throw new ForbiddenException('Tidak berwenang menyetujui transaksi ini');
    }

    if (row.status !== ArusKasStatus.PENDING) {
      throw new BadRequestException('Transaksi tidak dalam status menunggu persetujuan');
    }

    return this.prisma.arusKas.update({
      where: { id },
      data: {
        status: ArusKasStatus.APPROVED,
        approvedById: userId,
      },
      include: {
        reportedBy: { select: { fullname: true, email: true } },
        approvedBy: { select: { fullname: true, email: true } },
        items: true,
      },
    });
  }

  async rejectArusKas(userId: string, role: Role, id: string) {
    const row = asArusKasPoRow(
      await this.prisma.arusKas.findUnique({
        where: { id },
        include: { dapurUnit: true },
      }),
    );
    if (!row?.dapurUnit) throw new NotFoundException('Transaksi tidak ditemukan');

    const dapur = row.dapurUnit;
    const isSuper = role === Role.SUPER_ADMIN || role === Role.ADMIN;

    if (row.pendingPoApproval) {
      const canPo = role === Role.PROJECT_OWNER && dapur.projectOwnerId === userId;
      if (!canPo && !isSuper) {
        throw new ForbiddenException(
          'Pengajuan dari Admin Pusat hanya dapat ditolak oleh Project Owner',
        );
      }
      return this.prisma.arusKas.update({
        where: { id },
        data: asArusKasUpdate({
          pendingPoApproval: false,
          markedForDeletion: false,
          pendingEditData: Prisma.JsonNull,
        }),
        include: {
          reportedBy: { select: { fullname: true, email: true } },
          approvedBy: { select: { fullname: true, email: true } },
          items: true,
        },
      });
    }

    const isPusat = role === Role.ADMIN_PUSAT && dapur.adminPusatId === userId;
    const isPo = role === Role.PROJECT_OWNER && dapur.projectOwnerId === userId;
    if (!isPusat && !isPo && !isSuper) {
      throw new ForbiddenException('Tidak berwenang menolak transaksi ini');
    }

    if (row.status !== ArusKasStatus.PENDING) {
      throw new BadRequestException('Transaksi tidak dalam status menunggu persetujuan');
    }

    return this.prisma.arusKas.update({
      where: { id },
      data: {
        status: ArusKasStatus.REJECTED,
        approvedById: userId,
      },
      include: {
        reportedBy: { select: { fullname: true, email: true } },
        approvedBy: { select: { fullname: true, email: true } },
        items: true,
      },
    });
  }

  // ============================================
  // OPERATIONAL: STOK (Admin Dapur)
  // ============================================
  async updateStok(
    adminDapurId: string,
    dapurId: string,
    data: { itemName: string; quantity: number; unit: string },
    role?: Role,
  ) {
    const unitId = await this.resolveDapurUnitIdForUser(adminDapurId, role);
    if (!unitId || unitId !== dapurId) {
      throw new ForbiddenException('You are not assigned to this Dapur Unit');
    }

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
        status: POStatus.APPROVED, // Bypass approval process
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
      const txDate = evidenceData?.transactionDate ? new Date(evidenceData.transactionDate) : new Date();
      const generatedRefNo = await this.generateReferenceNo(txDate, tx);
      const referenceToSave = evidenceData?.referenceNo ? `${generatedRefNo} (${evidenceData.referenceNo})` : generatedRefNo;

      // 1. Create ArusKas entry (OUT) - Always PENDING because it's an Invoice Payment
      const kas = await tx.arusKas.create({
        data: {
          dapurUnitId: po.dapurUnitId,
          type: ArusKasType.OUT,
          bookType: bookType,
          amount: totalAmount,
          description: `Pembayaran Invoice PO #${po.id.slice(0,8)} - ${po.items[0]?.productName || 'Barang'}`,
          referenceNo: referenceToSave,
          evidenceUrl: evidenceData?.evidenceUrl,
          transactionDate: txDate,
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
      const refNoOut = await this.generateReferenceNo(tDate, tx);
      // 1. Record OUT from source book
      await tx.arusKas.create({
        data: {
          dapurUnitId: dapurId,
          type: ArusKasType.OUT,
          bookType: data.fromBook,
          amount: data.amount,
          description: `Transfer ke ${data.toBook === CashBookType.UMUM ? 'Kas Umum' : 'Kas Pembantu'}: ${data.description}`,
          referenceNo: refNoOut,
          transactionDate: tDate,
          category: 'INTERNAL_TRANSFER',
          reportedById: adminDapurId
        }
      });

      const refNoIn = await this.generateReferenceNo(tDate, tx);
      // 2. Record IN to destination book
      return tx.arusKas.create({
        data: {
          dapurUnitId: dapurId,
          type: ArusKasType.IN,
          bookType: data.toBook,
          amount: data.amount,
          description: `Terima dari ${data.fromBook === CashBookType.UMUM ? 'Kas Umum' : 'Kas Pembantu'}: ${data.description}`,
          referenceNo: refNoIn,
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
     if (po.status !== POStatus.PENDING && po.status !== POStatus.APPROVED) throw new ForbiddenException('Cannot edit PO that is already processed or rejected');

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

  async deletePurchaseOrder(reqUserId: string, reqUserRole: Role, poId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { dapurUnit: true }
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    const isOwner = reqUserRole === Role.PROJECT_OWNER && po.dapurUnit?.projectOwnerId === reqUserId;
    const isPusat = reqUserRole === Role.ADMIN_PUSAT && po.dapurUnit?.adminPusatId === reqUserId;
    const isDapur = reqUserRole === Role.ADMIN_DAPUR && po.dapurUnit?.adminDapurId === reqUserId;
    const isSuper = reqUserRole === Role.SUPER_ADMIN || reqUserRole === Role.ADMIN;
    
    if (!isOwner && !isPusat && !isDapur && !isSuper) {
       throw new ForbiddenException('Not authorized to delete this PO');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Delete LoadingGoodItem and LoadingGood if any
        const loadings = await tx.loadingGood.findMany({ where: { purchaseOrderId: poId } });
        for (const l of loadings) {
          await tx.loadingGoodItem.deleteMany({ where: { loadingGoodId: l.id } });
        }
        await tx.loadingGood.deleteMany({ where: { purchaseOrderId: poId } });

        // Delete POItems
        await tx.pOItem.deleteMany({ where: { purchaseOrderId: poId } });

        // Delete related Cashbacks just in case
        await tx.dapurCashback.deleteMany({ where: { purchaseOrderId: poId } });

        // Unlink Arus Kas if needed, actually if PO has an arusKasId, let's just delete the ArusKas? 
        // Or keep ArusKas and set its PO reference to null (but ArusKas has no poId, PO has arusKasId)
        // Since PurchaseOrder depends on ArusKas, deleting PurchaseOrder is fine, ArusKas stays. Wait, ArusKas model has `purchaseOrder PurchaseOrder? @relation("ArusKasPO")` meaning the relation is stored on PurchaseOrder. Deleting PurchaseOrder does not delete ArusKas.

        // Delete PO
        return await tx.purchaseOrder.delete({ where: { id: poId } });
      });
    } catch(err: any) {
      throw new BadRequestException('Gagal menghapus PO. Pastikan tidak ada data sensitif yang terikat.');
    }
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

    try {
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
    } catch (e) {
      this.rethrowPrismaMigrationHint(e);
    }
  }

  async getMyDapurUnit(userId: string, role?: Role) {
    const unitId = await this.resolveDapurUnitIdForUser(userId, role);
    if (!unitId) return null;
    return this.prisma.dapurUnit.findUnique({ where: { id: unitId } });
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

  async getPendingReceptionPOs(adminDapurId: string, role?: Role) {
    const unitId = await this.resolveDapurUnitIdForUser(adminDapurId, role);
    if (!unitId) return [];

    const unit = await this.prisma.dapurUnit.findUnique({ where: { id: unitId } });
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

  async receivePurchaseOrder(
    adminDapurId: string,
    poId: string,
    data: {
      notes?: string;
      items: {
        poItemId: string;
        quantityReceived: number;
        quantityRejected: number;
        quantityReturned: number;
        qualityCheck?: string;
        notes?: string;
      }[];
    },
    role?: Role,
  ) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { dapurUnit: true, items: true }
    });

    if (!po) throw new NotFoundException('Purchase Order not found');
    const unitId = await this.resolveDapurUnitIdForUser(adminDapurId, role);
    if (!unitId || unitId !== po.dapurUnitId) {
      throw new ForbiddenException('Not your Dapur PO');
    }
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

  async getStok(adminDapurId: string, category?: string, role?: Role) {
    const unitId = await this.resolveDapurUnitIdForUser(adminDapurId, role);
    if (!unitId) return [];

    return this.prisma.stok.findMany({
      where: { 
        dapurUnitId: unitId,
        ...(category && { category: category as any })
      },
      orderBy: { itemName: 'asc' }
    });
  }

  async createStokOpname(
    adminDapurId: string,
    dapurId: string,
    data: {
      itemName: string;
      unit: string;
      category?: 'BAHAN' | 'LAIN';
      physicalQty: number;
      note?: string;
    },
    role?: Role,
  ) {
    const unitId = await this.resolveDapurUnitIdForUser(adminDapurId, role);
    if (!unitId || unitId !== dapurId) {
      throw new ForbiddenException('You are not assigned to this Dapur Unit');
    }

    const category = (data.category as StokCategory) || StokCategory.BAHAN;
    const existingStok = await this.prisma.stok.findFirst({
      where: { dapurUnitId: dapurId, itemName: data.itemName, category }
    });

    const beforeQty = existingStok?.quantity || 0;
    const afterQty = Number(data.physicalQty) || 0;
    const difference = afterQty - beforeQty;

    return this.prisma.$transaction(async (tx) => {
      let updatedStok;
      if (existingStok) {
        updatedStok = await tx.stok.update({
          where: { id: existingStok.id },
          data: {
            quantity: afterQty,
            unit: data.unit || existingStok.unit,
            lastUpdatedById: adminDapurId
          }
        });
      } else {
        updatedStok = await tx.stok.create({
          data: {
            dapurUnitId: dapurId,
            itemName: data.itemName,
            quantity: afterQty,
            unit: data.unit,
            category,
            lastUpdatedById: adminDapurId
          }
        });
      }

      const log = await (tx as any).stokOpnameLog.create({
        data: {
          dapurUnitId: dapurId,
          stokId: updatedStok.id,
          itemName: data.itemName,
          unit: updatedStok.unit,
          category,
          beforeQty,
          afterQty,
          difference,
          note: data.note || null,
          performedById: adminDapurId,
          opnameAt: new Date(),
        },
        include: {
          performedBy: { select: { id: true, fullname: true, email: true } }
        }
      });

      return { stok: updatedStok, log };
    });
  }

  async getStokOpnameHistory(adminDapurId: string, category?: string, role?: Role) {
    const unitId = await this.resolveDapurUnitIdForUser(adminDapurId, role);
    if (!unitId) return [];

    return (this.prisma as any).stokOpnameLog.findMany({
      where: {
        dapurUnitId: unitId,
        ...(category ? { category: category as StokCategory } : {})
      },
      include: {
        performedBy: { select: { id: true, fullname: true, email: true } },
        stok: { select: { id: true, quantity: true, unit: true, itemName: true } },
      },
      orderBy: { opnameAt: 'desc' }
    });
  }

  async getLoadingGoodsHistory(adminDapurId: string, role?: Role) {
    const unitId = await this.resolveDapurUnitIdForUser(adminDapurId, role);
    if (!unitId) return [];

    return this.prisma.loadingGood.findMany({
      where: { purchaseOrder: { dapurUnitId: unitId } },
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
  // ============================================
  // LABA RUGI (PROFIT & LOSS)
  // ============================================

  async calculateLabaRugi(role: Role, dapurId: string, period: string) {
    if (role !== Role.ADMIN_PUSAT && role !== Role.SUPER_ADMIN && role !== Role.PROJECT_OWNER) {
      throw new ForbiddenException('Akses ditolak: Hanya Admin Pusat yang bisa kalkulasi Laba Rugi');
    }
    
    // period format: YYYY-MM
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // 1st day of next month

    const arusKasList = await this.prisma.arusKas.findMany({
      where: {
        dapurUnitId: dapurId,
        status: 'APPROVED', // Only calculate approved transactions
        transactionDate: {
          gte: startDate,
          lt: endDate,
        }
      }
    });

    let totalIncome = 0;
    let totalExpense = 0;

    for (const ak of arusKasList) {
      if (ak.type === 'IN') {
        totalIncome += ak.amount;
      } else if (ak.type === 'OUT') {
        totalExpense += ak.amount;
      }
    }

    const netProfit = totalIncome - totalExpense;

    // @ts-ignore
    const existing = await this.prisma.dapurLabaRugi.findUnique({
      where: {
        dapurUnitId_period: {
          dapurUnitId: dapurId,
          period: period
        }
      }
    });

    return {
      dapurId,
      period,
      totalIncome,
      totalExpense,
      netProfit,
      isPublished: !!existing,
      publishedAt: existing?.publishedAt,
      report: existing
    };
  }

  async publishLabaRugi(userId: string, role: Role, dapurId: string, period: string) {
    if (role !== Role.ADMIN_PUSAT && role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Akses ditolak: Hanya Admin Pusat yang bisa publish Laba Rugi');
    }

    // Recalculate to get latest numbers
    const calc = await this.calculateLabaRugi(role, dapurId, period);

    if (calc.isPublished) {
      throw new BadRequestException('Laba Rugi untuk periode ini sudah dipublish');
    }

    // @ts-ignore
    return this.prisma.dapurLabaRugi.create({
      data: {
        dapurUnitId: dapurId,
        period: period,
        totalIncome: calc.totalIncome,
        totalExpense: calc.totalExpense,
        netProfit: calc.netProfit,
        status: 'PUBLISHED',
        publishedById: userId
      }
    });
  }

  async getPublishedLabaRugi(role: Role, dapurId: string) {
    // @ts-ignore
    return this.prisma.dapurLabaRugi.findMany({
      where: {
        dapurUnitId: dapurId,
        status: 'PUBLISHED'
      },
      include: {
        publishedBy: { select: { fullname: true, email: true } }
      },
      orderBy: { period: 'desc' }
    });
  }
}
