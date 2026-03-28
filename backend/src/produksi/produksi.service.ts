import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProduksiService {
  constructor(private prisma: PrismaService) {}

  // ─── Helper: verify user belongs to dapur ──────────────────────────────────
  private async verifyDapurAccess(userId: string, dapurUnitId: string) {
    const dapur = await this.prisma.dapurUnit.findUnique({ where: { id: dapurUnitId } });
    if (!dapur) throw new NotFoundException('Dapur tidak ditemukan');
    return dapur;
  }

  // ============================================================
  // JENIS PORSI (PortionType)
  // ============================================================

  async createPortionType(data: { name: string; description?: string }) {
    return this.prisma.portionType.create({
      data,
    });
  }

  async getPortionTypes() {
    return this.prisma.portionType.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async updatePortionType(id: string, data: { name?: string; description?: string }) {
    return this.prisma.portionType.update({ where: { id }, data });
  }

  async deletePortionType(id: string) {
    return this.prisma.portionType.delete({ where: { id } });
  }

  // ============================================================
  // TEMPLATE MENU
  // ============================================================

  async createMenu(data: { 
    name: string; 
    description?: string; 
    category?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    dapurUnitId?: string;
  }, user: any) {
    return this.prisma.menu.create({
      data,
      include: { ingredients: { include: { portionType: true } } },
    });
  }

  async createMenuBulk(data: {
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
  }, user: any) {
    const types = await this.prisma.portionType.findMany();
    const typeMap = new Map(types.map(t => [t.name.toLowerCase(), t.id]));

    return this.prisma.$transaction(async (tx) => {
      let count = 0;
      for (const m of data.menus) {
        if (!m.name) continue;

        let menu = await tx.menu.findFirst({
          where: { name: m.name, dapurUnitId: data.dapurUnitId || null }
        });

        if (menu) {
          menu = await tx.menu.update({
            where: { id: menu.id },
            data: {
              category: m.category,
              calories: m.calories || null,
              protein: m.protein || null,
              carbs: m.carbs || null,
              fat: m.fat || null,
            }
          });
        } else {
          menu = await tx.menu.create({
            data: {
              name: m.name,
              category: m.category,
              calories: m.calories || null,
              protein: m.protein || null,
              carbs: m.carbs || null,
              fat: m.fat || null,
              dapurUnitId: data.dapurUnitId || null,
            }
          });
        }
        
        await tx.menuIngredient.deleteMany({ where: { menuId: menu.id } });

        for (const ing of m.ingredients || []) {
          if (!ing.portionTypeName || !ing.ingredientName || ing.quantity <= 0) continue;
          
          const typeNameLower = ing.portionTypeName.toLowerCase();
          let pTypeId = typeMap.get(typeNameLower);
          
          if (!pTypeId) {
             const created = await tx.portionType.create({ data: { name: ing.portionTypeName } });
             pTypeId = created.id;
             typeMap.set(typeNameLower, pTypeId);
          }

          await tx.menuIngredient.create({
            data: {
              menuId: menu.id,
              portionTypeId: pTypeId,
              ingredientName: ing.ingredientName,
              gramsPerPortion: ing.quantity,
              unit: ing.unit || 'g'
            }
          });
        }
        count++;
      }
      return { success: true, count };
    });
  }

  async getMenus(dapurUnitId?: string) {
    const whereCondition = dapurUnitId ? { OR: [{ dapurUnitId }, { dapurUnitId: null }] } : { dapurUnitId: null };
    return this.prisma.menu.findMany({
      where: whereCondition,
      include: {
        ingredients: { include: { portionType: true } },
        _count: { select: { dailyEntries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMenuById(id: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        ingredients: { include: { portionType: true } },
      },
    });
    if (!menu) throw new NotFoundException('Menu tidak ditemukan');
    return menu;
  }

  async copyMenuFromGlobal(id: string, dapurUnitId: string, user: any) {
    const globalMenu = await this.getMenuById(id);
    if (globalMenu.dapurUnitId !== null) {
      throw new BadRequestException('Hanya dapat menyalin dari Menu Master Pusat');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create local copy
      const localMenu = await tx.menu.create({
        data: {
          name: `${globalMenu.name} (Lokal)`, // Make name unique locally
          description: globalMenu.description,
          category: globalMenu.category,
          calories: globalMenu.calories,
          protein: globalMenu.protein,
          carbs: globalMenu.carbs,
          fat: globalMenu.fat,
          dapurUnitId,
        }
      });

      // Copy ingredients
      if (globalMenu.ingredients.length > 0) {
        await tx.menuIngredient.createMany({
          data: globalMenu.ingredients.map(ing => ({
            menuId: localMenu.id,
            portionTypeId: ing.portionTypeId,
            ingredientName: ing.ingredientName,
            gramsPerPortion: ing.gramsPerPortion,
            unit: ing.unit,
          }))
        });
      }
      
      return localMenu;
    });
  }

  async updateMenu(id: string, data: { 
    name?: string; 
    description?: string; 
    category?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }, user: any) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('Menu tidak ditemukan');
    
    if (menu.dapurUnitId === null && !['ADMIN_PUSAT', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Akses ditolak: Menu ini adalah Master Global dari Admin Pusat.');
    }

    return this.prisma.menu.update({
      where: { id },
      data,
      include: { ingredients: { include: { portionType: true } } },
    });
  }

  async deleteMenu(id: string, user: any) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (menu && menu.dapurUnitId === null && !['ADMIN_PUSAT', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Akses ditolak: Tidak dapat menghapus Master Menu Global.');
    }
    return this.prisma.menu.delete({ where: { id } });
  }

  // ─── Ingredient management per menu ────────────────────────────────────────

  async upsertMenuIngredients(
    menuId: string,
    ingredients: { portionTypeId: string; ingredientName: string; unit: string; gramsPerPortion: number }[],
    user: any
  ) {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (menu && menu.dapurUnitId === null && !['ADMIN_PUSAT', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Akses ditolak: Tidak dapat mengubah BOM Menu Master Global.');
    }

    // Delete existing, then re-insert (simpler than upsert for array)
    await this.prisma.menuIngredient.deleteMany({ where: { menuId } });
    await this.prisma.menuIngredient.createMany({
      data: ingredients.map((i) => ({ menuId, ...i })),
    });
    return this.getMenuById(menuId);
  }

  async deleteMenuIngredient(id: string, user: any) {
    const ing = await this.prisma.menuIngredient.findUnique({ where: { id }, include: { menu: true } });
    if (ing?.menu?.dapurUnitId === null && !['ADMIN_PUSAT', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Akses ditolak.');
    }
    return this.prisma.menuIngredient.delete({ where: { id } });
  }

  // ============================================================
  // RENCANA MENU BULANAN
  // ============================================================

  async getOrCreateMonthlyPlan(dapurUnitId: string, year: number, month: number, createdBy: string) {
    const existing = await this.prisma.monthlyMenuPlan.findUnique({
      where: { dapurUnitId_year_month: { dapurUnitId, year, month } },
      include: {
        dailyEntries: {
          include: {
            menu: true,
            portions: { include: { portionType: true } },
          },
          orderBy: { date: 'asc' },
        },
      },
    });
    if (existing) return existing;

    return this.prisma.monthlyMenuPlan.create({
      data: { dapurUnitId, year, month, createdBy },
      include: {
        dailyEntries: {
          include: {
            menu: true,
            portions: { include: { portionType: true } },
          },
        },
      },
    });
  }

  async getDailyEntries(monthlyPlanId: string) {
    return this.prisma.dailyMenuEntry.findMany({
      where: { monthlyPlanId },
      include: {
        menu: { include: { ingredients: { include: { portionType: true } } } },
        portions: { include: { portionType: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async setDailyMenu(
    monthlyPlanId: string,
    date: string,
    entries: { menuId: string; notes?: string; portions: { portionTypeId: string; quantity: number }[] }[],
  ) {
    const dateObj = new Date(date);
    // Delete existing entries for this date
    await this.prisma.dailyMenuEntry.deleteMany({
      where: { monthlyPlanId, date: dateObj },
    });

    // Create new entries
    for (const entry of entries) {
      await this.prisma.dailyMenuEntry.create({
        data: {
          monthlyPlanId,
          date: dateObj,
          menuId: entry.menuId,
          notes: entry.notes,
          portions: {
            create: entry.portions.map((p) => ({
              portionTypeId: p.portionTypeId,
              quantity: p.quantity,
            })),
          },
        },
      });
    }

    return this.getDailyEntries(monthlyPlanId);
  }

  async deleteDailyEntry(id: string) {
    // Hapus relasi porsi terlebih dahulu untuk menghindari constraint P2003
    await this.prisma.dailyMenuPortion.deleteMany({
      where: { dailyEntryId: id }
    });
    return this.prisma.dailyMenuEntry.delete({ where: { id } });
  }

  // ============================================================
  // KALKULASI KEBUTUHAN BAHAN BAKU (untuk PO)
  // ============================================================

  async calculateIngredientNeeds(monthlyPlanId: string, dateStart?: string, dateEnd?: string) {
    const whereDate: any = { monthlyPlanId };
    if (dateStart) whereDate.date = { gte: new Date(dateStart) };
    if (dateEnd) whereDate.date = { ...whereDate.date, lte: new Date(dateEnd) };

    const entries = await this.prisma.dailyMenuEntry.findMany({
      where: whereDate,
      include: {
        menu: {
          include: {
            ingredients: { include: { portionType: true } },
          },
        },
        portions: { include: { portionType: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Akumulasi kebutuhan bahan per ingredientName+unit
    const ingredientMap: Record<
      string,
      { ingredientName: string; unit: string; totalGrams: number; byDay: Record<string, number> }
    > = {};

    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split('T')[0];

      for (const portion of entry.portions) {
        const portionQty = portion.quantity;

        // Find ingredients for this menu + portionType
        const relevantIngredients = entry.menu.ingredients.filter(
          (ing) => ing.portionTypeId === portion.portionTypeId,
        );

        for (const ing of relevantIngredients) {
          const key = `${ing.ingredientName}___${ing.unit}`;
          if (!ingredientMap[key]) {
            ingredientMap[key] = {
              ingredientName: ing.ingredientName,
              unit: ing.unit,
              totalGrams: 0,
              byDay: {},
            };
          }
          const needed = ing.gramsPerPortion * portionQty;
          ingredientMap[key].totalGrams += needed;
          ingredientMap[key].byDay[dateKey] = (ingredientMap[key].byDay[dateKey] || 0) + needed;
        }
      }
    }

    const result = Object.values(ingredientMap).sort((a, b) =>
      a.ingredientName.localeCompare(b.ingredientName),
    );

    const grandTotal = result.reduce((sum, i) => sum + i.totalGrams, 0);

    return {
      ingredients: result,
      grandTotalGrams: grandTotal,
      dateRange: {
        start: dateStart,
        end: dateEnd,
      },
      entriesCount: entries.length,
    };
  }

  async calculateHPP(monthlyPlanId: string, dateStart?: string, dateEnd?: string) {
    const plan = await this.prisma.monthlyMenuPlan.findUnique({ where: { id: monthlyPlanId } });
    if (!plan) throw new NotFoundException('Plan tidak ditemukan');

    const whereDate: any = { monthlyPlanId };
    if (dateStart) whereDate.date = { gte: new Date(dateStart) };
    if (dateEnd) whereDate.date = { ...whereDate.date, lte: new Date(dateEnd) };

    const entries = await this.prisma.dailyMenuEntry.findMany({
      where: whereDate,
      include: {
        menu: {
          include: {
            ingredients: { include: { portionType: true } },
          },
        },
        portions: { include: { portionType: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Ambil harga terakhir dari PO Item untuk Dapur ini sebagai referensi "harga belanja"
    const latestPOItems = await this.prisma.pOItem.findMany({
      where: { purchaseOrder: { dapurUnitId: plan.dapurUnitId } },
      orderBy: { purchaseOrder: { createdAt: 'desc' } },
      select: { productName: true, pricePerUnit: true }
    });

    const priceMap: Record<string, number> = {};
    for (const item of latestPOItems) {
      if (item.productName && priceMap[item.productName.toLowerCase()] === undefined) {
        priceMap[item.productName.toLowerCase()] = item.pricePerUnit;
      }
    }

    const results = [];

    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split('T')[0];
      
      for (const portion of entry.portions) {
        let totalCostPerPortion = 0;

        const relevantIngredients = entry.menu.ingredients.filter(
          (ing) => ing.portionTypeId === portion.portionTypeId,
        );

        const ingredientDetails = [];

        for (const ing of relevantIngredients) {
          const neededGrams = ing.gramsPerPortion;
          // Cari harga berdasarkan nama bahan baku (case insensitive)
          const unitPrice = priceMap[ing.ingredientName.toLowerCase()] || 0;
          const cost = unitPrice * neededGrams;
          totalCostPerPortion += cost;

          ingredientDetails.push({
            ingredientName: ing.ingredientName,
            needed: neededGrams,
            unit: ing.unit,
            unitPrice: unitPrice,
            cost: cost
          });
        }

        const quantity = portion.quantity;
        const totalCostAllPortions = totalCostPerPortion * quantity;

        results.push({
          date: dateKey,
          menuName: entry.menu.name,
          portionTypeName: portion.portionType.name,
          totalCost: totalCostAllPortions,
          quantity: quantity,
          hppPerPortion: totalCostPerPortion,
          ingredients: ingredientDetails
        });
      }
    }

    return results;
  }
}
