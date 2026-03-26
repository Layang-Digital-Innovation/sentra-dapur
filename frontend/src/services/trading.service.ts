import axiosInstance from '@/utils/axiosConfig';

export const tradingService = {
  // Products
  async getApprovedProducts(params?: { sellerId?: string }) {
    const qs = new URLSearchParams();
    if (params?.sellerId) qs.set('sellerId', params.sellerId);
    const { data } = await axiosInstance.get(`/trading/products${qs.toString() ? `?${qs.toString()}` : ''}`);
    return data as any[];
  },
  async getProduct(id: string) {
    const { data } = await axiosInstance.get(`/trading/products/${id}`);
    return data as any;
  },
  async createProduct(payload: { sellerId?: string; name: string; description: string; prices: Array<{ currency: 'IDR' | 'USD'; price: number }>; unit: string; weight: number; volume: string; }) {
    const { data } = await axiosInstance.post('/trading/products', payload);
    return data as any;
  },
  async updateProduct(id: string, payload: Partial<{ name: string; description: string; prices: Array<{ currency: 'IDR' | 'USD'; price: number }>; unit: string; weight: number; volume: string; }>) {
    const { data } = await axiosInstance.put(`/trading/products/${id}`, payload);
    return data as any;
  },
  async getSellerProducts() {
    const { data } = await axiosInstance.get('/trading/seller/products');
    return data as any[];
  },
  async adminListProducts() {
    const { data } = await axiosInstance.get('/trading/admin/products');
    return data as any[];
  },
  
  async getSellerProfileById(userId: string) {
    const { data } = await axiosInstance.get(`/trading/seller/${userId}/profile`);
    return data as any;
  },
  async approveProduct(id: string) {
    const { data } = await axiosInstance.put(`/trading/admin/products/${id}/approve`, {});
    return data as any;
  },
  async rejectProduct(id: string, reason?: string) {
    const { data } = await axiosInstance.put(`/trading/admin/products/${id}/reject`, { reason });
    return data as any;
  },

  // Orders
  async createOrder(payload: { productId: string; quantity: number; notes?: string; currency: 'IDR' | 'USD' }) {
    const { data } = await axiosInstance.post('/trading/orders', payload);
    return data as any;
  },
  // Create a draft order from cart checkout with destination details
  async createDraftOrder(payload: {
    items: Array<{ productId: string; quantity: number; unitPriceEstimate?: number | null; currency?: 'IDR' | 'USD' | null }>;
    destinationCountry: string;
    destinationState?: string | null;
    destinationCity?: string | null;
    addressLine?: string | null;
    postalCode?: string | null;
    incoterm?: string | null;
    notes?: string | null;
  }) {
    try {
      const { data } = await axiosInstance.post('/trading/orders/draft', payload);
      return data as { id: string };
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        // Fallback to generic orders endpoint for backends without /draft route
        // Create one order per item with combined destination notes
        const createdIds: string[] = [];
        const makeNotes = () => {
          const lines: string[] = [];
          if (payload.notes) lines.push(`Notes: ${payload.notes}`);
          lines.push(`Destination: ${payload.destinationCountry}${payload.destinationState? ', '+payload.destinationState: ''}, ${payload.destinationCity || '-'}${payload.postalCode? ' '+payload.postalCode: ''}`);
          if (payload.addressLine) lines.push(`Address: ${payload.addressLine}`);
          if (payload.incoterm) lines.push(`Incoterm: ${payload.incoterm}`);
          return lines.join(' | ');
        };
        const combinedNotes = makeNotes();
        for (const raw of payload.items || []) {
          const pid = (raw as any)?.productId;
          const qtyNum = Number((raw as any)?.quantity ?? 1);
          if (!pid || !String(pid).trim() || !(qtyNum >= 1)) continue;
          const body = {
            productId: String(pid),
            quantity: qtyNum,
            notes: combinedNotes,
            currency: ((raw as any)?.currency as 'IDR'|'USD') || 'USD',
          };
          try {
            const { data } = await axiosInstance.post('/trading/orders', body);
            if (data?.id) createdIds.push(data.id);
          } catch (e) {
            // continue other items; at least create some
          }
        }
        return createdIds.length ? ({ id: createdIds[0], ids: createdIds } as any) : ({ id: undefined, ids: [] } as any);
      }
      throw err;
    }
  },
  async getOrders(params?: { status?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const { data } = await axiosInstance.get(`/trading/orders${qs.toString() ? `?${qs.toString()}` : ''}`);
    return data as any[];
  },
  async adminListOrders(params?: { status?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    const { data } = await axiosInstance.get(`/trading/orders${qs.toString() ? `?${qs.toString()}` : ''}`);
    return data as any[];
  },
  async getOrder(id: string) {
    const { data } = await axiosInstance.get(`/trading/orders/${id}`);
    return data as any;
  },
  // Admin: set fixed prices per order item based on destination
  async setOrderFixedPrices(orderId: string, payload: { items: Array<{ orderItemId?: string; productId?: string; fixedUnitPrice: number; currency: 'IDR' | 'USD' }> }) {
    const { data } = await axiosInstance.put(`/trading/orders/${orderId}/fixed-prices`, payload);
    return data as any;
  },
  async updateOrderStatus(id: string, payload: { status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' }) {
    const { data } = await axiosInstance.put(`/trading/orders/${id}/status`, payload);
    return data as any;
  },
  async createShipment(orderId: string, payload: { method: 'AIR' | 'SEA' | 'EXPRESS' }) {
    const { data } = await axiosInstance.post(`/trading/orders/${orderId}/shipment`, payload);
    return data as any;
  },
  async updateShipmentStatus(id: string, payload: { status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' }) {
    const { data } = await axiosInstance.put(`/trading/shipments/${id}/status`, payload);
    return data as any;
  },
  async updateShipment(
    id: string,
    payload: {
      method?: 'AIR' | 'SEA' | 'EXPRESS';
      carrier?: string | null;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
      seaPricingMode?: 'CBM' | 'CONTAINER' | null;
      cbmVolume?: number | null;
      containerType?: 'FT20' | 'FT40' | null;
      freightCost?: number | null;
      currency?: string | null;
    }
  ) {
    const { data } = await axiosInstance.put(`/trading/shipments/${id}`, payload);
    return data as any;
  },

  // Seller profile
  async getSellerProfile() {
    const { data } = await axiosInstance.get('/trading/seller/profile');
    return data as any;
  },
  async upsertSellerProfile(payload: { country?: string; province?: string; city?: string; address?: string }) {
    const { data } = await axiosInstance.put('/trading/seller/profile', payload);
    return data as any;
  },

  // Shipping methods
  async listShippingMethods() {
    const { data } = await axiosInstance.get('/trading/shipping/methods');
    return data as { code: string; label: string }[];
  },

  // Analytics
  async getAdminTradingAnalytics() {
    const { data } = await axiosInstance.get('/trading/admin/analytics');
    return data as { totalProducts: number; pendingProducts: number; totalOrders: number; ordersByStatus: Record<string, number>; totalRevenue: number };
  },
  async getBuyerAnalytics() {
    const { data } = await axiosInstance.get('/trading/buyer/analytics');
    return data as { totalOrders: number; pendingOrders: number; totalSpent: number; recentOrders: any[] };
  },
  async getSellerAnalytics() {
    const { data } = await axiosInstance.get('/trading/seller/analytics');
    return data as { totalProducts: number; totalOrders: number; totalRevenue: number; pendingShipments: number; recentOrders: any[]; topProducts: { id: string; name: string; sold: number; revenue: number }[] };
  },

  // Product images attach
  async attachProductImages(productId: string, payload: {
    cover?: { url: string; filename: string; originalName: string; size: number; mimeType: string } | null;
    previews?: Array<{ url: string; filename: string; originalName: string; size: number; mimeType: string }>;
  }) {
    const { data } = await axiosInstance.put(`/trading/products/${productId}/images`, payload);
    return data as any;
  },
};
