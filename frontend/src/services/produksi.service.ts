import axiosInstance from '@/utils/axiosConfig';

const BASE = '/produksi';

// ─── JENIS PORSI ────────────────────────────────────────────────────────────
export const portionTypeApi = {
  getAll: () =>
    axiosInstance.get(`${BASE}/porsi`).then(r => r.data),
  create: (data: { name: string; description?: string }) =>
    axiosInstance.post(`${BASE}/porsi`, data).then(r => r.data),
  update: (id: string, data: { name?: string; description?: string }) =>
    axiosInstance.put(`${BASE}/porsi/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/porsi/${id}`).then(r => r.data),
};

// ─── TEMPLATE MENU ──────────────────────────────────────────────────────────
export const menuApi = {
  getAll: (dapurUnitId?: string) =>
    axiosInstance.get(`${BASE}/menu${dapurUnitId ? `?dapurUnitId=${dapurUnitId}` : ''}`).then(r => r.data),
  getById: (id: string) =>
    axiosInstance.get(`${BASE}/menu/${id}`).then(r => r.data),
  create: (data: { name: string; description?: string; category?: string; calories?: number; protein?: number; carbs?: number; fat?: number; dapurUnitId?: string; }) =>
    axiosInstance.post(`${BASE}/menu`, data).then(r => r.data),
  createBulk: (data: { menus: any[], dapurUnitId?: string; }) =>
    axiosInstance.post(`${BASE}/menu/bulk`, data).then(r => r.data),
  copyMenu: (id: string, data: { dapurUnitId: string; }) => 
    axiosInstance.post(`${BASE}/menu/${id}/copy`, data).then(r => r.data),
  update: (id: string, data: { name?: string; description?: string; category?: string; calories?: number; protein?: number; carbs?: number; fat?: number; dapurUnitId?: string; }) =>
    axiosInstance.put(`${BASE}/menu/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/menu/${id}`).then(r => r.data),

  // Bahan baku per menu
  upsertIngredients: (
    menuId: string,
    ingredients: { portionTypeId: string; ingredientName: string; unit: string; gramsPerPortion: number }[],
  ) => axiosInstance.put(`${BASE}/menu/${menuId}/ingredients`, { ingredients }).then(r => r.data),
};

// ─── RENCANA MENU BULANAN ───────────────────────────────────────────────────
export const rencanaApi = {
  getOrCreate: (dapurId: string, year: number, month: number) =>
    axiosInstance.get(`${BASE}/dapur/${dapurId}/rencana/${year}/${month}`).then(r => r.data),
  getDailyEntries: (planId: string) =>
    axiosInstance.get(`${BASE}/rencana/${planId}/daily`).then(r => r.data),
  setDailyMenu: (
    planId: string,
    date: string,
    entries: { menuId: string; notes?: string; portions: { portionTypeId: string; quantity: number }[] }[],
  ) => axiosInstance.post(`${BASE}/rencana/${planId}/daily`, { date, entries }).then(r => r.data),
  deleteDailyEntry: (id: string) =>
    axiosInstance.delete(`${BASE}/daily/${id}`).then(r => r.data),

  // Kalkulasi PO
  calculateNeeds: (planId: string, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    return axiosInstance
      .get(`${BASE}/rencana/${planId}/kalkulasi?${params.toString()}`)
      .then(r => r.data);
  },
  
  // Kalkulasi HPP per porsi
  calculateHPP: (planId: string, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    return axiosInstance
      .get(`${BASE}/rencana/${planId}/hpp?${params.toString()}`)
      .then(r => r.data as HPPCalculationResult[]);
  },
};

// ─── Types ──────────────────────────────────────────────────────────────────
export interface PortionType {
  id: string;
  name: string;
  description?: string;
}

export interface MenuIngredient {
  id: string;
  menuId: string;
  portionTypeId: string;
  portionType: PortionType;
  ingredientName: string;
  unit: string;
  gramsPerPortion: number;
}

export interface Menu {
  id: string;
  name: string;
  description?: string;
  category?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  dapurUnitId?: string | null;
  ingredients: MenuIngredient[];
  _count?: { dailyEntries: number };
}

export interface DailyMenuPortion {
  id: string;
  portionTypeId: string;
  portionType: PortionType;
  quantity: number;
}

export interface DailyMenuEntry {
  id: string;
  date: string;
  menuId: string;
  menu: Menu;
  notes?: string;
  portions: DailyMenuPortion[];
}

export interface MonthlyMenuPlan {
  id: string;
  dapurUnitId: string;
  year: number;
  month: number;
  dailyEntries: DailyMenuEntry[];
}

export interface IngredientNeed {
  ingredientName: string;
  unit: string;
  totalGrams: number;
  byDay: Record<string, number>;
}

export interface IngredientCalculation {
  ingredients: IngredientNeed[];
  grandTotalGrams: number;
  dateRange: { start?: string; end?: string };
  entriesCount: number;
}

export interface HPPIngredientDetail {
  ingredientName: string;
  needed: number;
  unit: string;
  unitPrice: number;
  cost: number;
}

export interface HPPCalculationResult {
  date: string;
  menuName: string;
  portionTypeName: string;
  totalCost: number;
  quantity: number;
  hppPerPortion: number;
  ingredients: HPPIngredientDetail[];
}
