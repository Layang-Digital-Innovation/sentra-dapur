const normalizeApiBase = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw && raw.length > 0) {
    const noTrailingSlash = raw.replace(/\/+$/, '');
    return noTrailingSlash.endsWith('/api') ? noTrailingSlash : `${noTrailingSlash}/api`;
  }
  return '/api';
};

const API_BASE_URL = normalizeApiBase();

export interface DapurUnit {
  id: string;
  name: string;
  location?: string;
  status: string;
  projectOwnerId: string;
  adminPusatId?: string;
  adminDapurId?: string;
  investors: any[];
  arusKas?: any[];
  purchaseOrders?: any[];
  logoUrl?: string;
  fullAddress?: string;
  signatureUrl?: string;
  adminDapur?: { id: string; fullname: string; email: string };
  adminPusat?: { id: string; fullname: string; email: string };
  adminDapurName?: string;
  reportedBy?: { fullname: string; email: string };
  approvedBy?: { fullname: string; email: string };
  createdAt: string;
}

class DapurService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const userStr = localStorage.getItem('user');
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.access_token;
      } catch (error) {}
    }
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getMyDapur(): Promise<DapurUnit[]> {
    const response = await fetch(`${API_BASE_URL}/dapur`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<DapurUnit[]>(response);
  }

  async createDapur(data: { name: string; location?: string; adminPusatId?: string }) {
    const response = await fetch(`${API_BASE_URL}/dapur`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async assignAdminDapur(dapurId: string, adminDapurId: string) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/assign-admin-dapur`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ adminDapurId }),
    });
    return this.handleResponse(response);
  }

  async setInvestors(dapurId: string, investors: { investorId: string; amount: number; profitSharingPct: number; profitSharingPctPreBEP?: number; profitSharingPctPostBEP?: number }[]) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/investors`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ investors }),
    });
    return this.handleResponse(response);
  }

  async reportArusKas(dapurId: string, data: { 
    type: 'IN' | 'OUT'; 
    bookType: 'UMUM' | 'PEMBANTU'; 
    amount: number; 
    description: string; 
    referenceNo?: string; 
    evidenceUrl?: string; 
    transactionDate?: string;
    items?: { name: string; quantity: number; unit?: string; pricePerUnit?: number; total?: number }[];
  }) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/arus-kas`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }
  async getArusKas(dapurId: string, bookType?: string) {
    const url = bookType ? `${API_BASE_URL}/dapur/${dapurId}/arus-kas?bookType=${bookType}` : `${API_BASE_URL}/dapur/${dapurId}/arus-kas`;
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async approveArusKas(id: string) {
    const response = await fetch(`${API_BASE_URL}/dapur/arus-kas/${id}/approve`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async rejectArusKas(id: string) {
    const response = await fetch(`${API_BASE_URL}/dapur/arus-kas/${id}/reject`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateStok(dapurId: string, data: { itemName: string; quantity: number; unit: string }) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/stok`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async createPO(dapurId: string, items: { productName: string; quantity: number; unit?: string; supplierName?: string; pricePerUnit?: number }[], type: string = 'BAHAN') {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/po`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ items, type }),
    });
    return this.handleResponse(response);
  }

  async updatePurchaseOrder(poId: string, items: any[]) {
    const response = await fetch(`${API_BASE_URL}/dapur/po/${poId}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    return this.handleResponse(response);
  }

  async getPurchaseOrders() {
    const response = await fetch(`${API_BASE_URL}/dapur/po`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async approvePO(poId: string, status: string) {
    const response = await fetch(`${API_BASE_URL}/dapur/po/${poId}/approve`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return this.handleResponse(response);
  }

  async sendPOToSupplier(poId: string, supplierName: string) {
    const response = await fetch(`${API_BASE_URL}/dapur/po/${poId}/send`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ supplierName }),
    });
    if (!response.ok) {
       const err = await response.json();
       throw new Error(err.message || 'Gagal mengirim PO ke supplier');
    }
    return response.json();
  }

  async getMyUnit(): Promise<DapurUnit | null> {
    const response = await fetch(`${API_BASE_URL}/dapur/my-unit`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<DapurUnit | null>(response);
  }

  async updateBranding(dapurId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/branding`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getMyStok(category?: string) {
    const url = category ? `${API_BASE_URL}/dapur/my-stok?category=${category}` : `${API_BASE_URL}/dapur/my-stok`;
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getIncomingPOs() {
    const response = await fetch(`${API_BASE_URL}/dapur/po/incoming`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getLoadingHistory() {
    const response = await fetch(`${API_BASE_URL}/dapur/po/history`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async receivePO(poId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/dapur/po/${poId}/receive`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }
  async payPO(dapurId: string, poId: string, data: { bookType: 'UMUM' | 'PEMBANTU'; referenceNo?: string; evidenceUrl?: string; transactionDate?: string }) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/po/${poId}/pay`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async transferCash(dapurId: string, data: { amount: number; fromBook: 'UMUM' | 'PEMBANTU'; toBook: 'UMUM' | 'PEMBANTU'; description: string; transactionDate?: string }) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/arus-kas/transfer`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  // ============================================================
  // DIVIDEND & CASHBACK (Admin Pusat / PO)
  // ============================================================

  async reportDividend(dapurId: string, data: { totalAmount: number; period?: string; description?: string }) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/dividend`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getDividends(dapurId: string) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/dividends`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async reportCashback(dapurId: string, data: { amount: number; supplierName?: string; purchaseOrderId?: string; description?: string; transactionDate?: string }) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/cashback`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getCashbacks(dapurId: string) {
    const response = await fetch(`${API_BASE_URL}/dapur/${dapurId}/cashbacks`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }
}

export const dapurService = new DapurService();
