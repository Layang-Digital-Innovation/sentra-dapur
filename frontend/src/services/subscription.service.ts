import axiosInstance from '@/utils/axiosConfig';

export const subscriptionService = {
  async getSubscriptionPlans() {
    const { data } = await axiosInstance.get('/subscription/plans');
    return data;
  },
  
  async getAllSubscriptions() {
    const { data } = await axiosInstance.get('/subscription/all');
    return data;
  },

  async getMySubscription() {
    const { data } = await axiosInstance.get('/subscription/my');
    return data;
  },

  async getMyPayments() {
    const { data } = await axiosInstance.get('/subscription/payments');
    return data;
  },

  async createEnterpriseLabel(payload: { name: string; description?: string }) {
    const { data } = await axiosInstance.post('/subscription/enterprise/label', payload);
    return data;
  },

  async getEnterpriseLabels() {
    const { data } = await axiosInstance.get('/subscription/enterprise/labels');
    return data;
  },

  async updateEnterpriseLabel(id: string, payload: { name?: string; description?: string }) {
    const { data } = await axiosInstance.put(`/subscription/enterprise/labels/${id}`, payload);
    return data;
  },

  async deleteEnterpriseLabel(id: string) {
    const { data } = await axiosInstance.delete(`/subscription/enterprise/labels/${id}`);
    return data;
  },

  async bulkCreateInvestorsForLabel(payload: { labelId: string; investors: { email: string; fullName?: string; password?: string }[]; defaultPassword?: string; requireUniqueEmail?: boolean }) {
    const { data } = await axiosInstance.post('/subscription/enterprise/label/investors/bulk-create', payload);
    return data;
  },

  async bulkSubscribeInvestorsForLabel(payload: { labelId: string; userIds: string[]; price: number; currency: string; period: 'MONTHLY' | 'YEARLY'; autoActivate?: boolean }) {
    const { data } = await axiosInstance.post('/subscription/enterprise/label/investors/bulk-subscribe', payload);
    return data;
  },

  // Create a single organization invoice (ORG_INVOICE) for a label's selected users
  async createOrgInvoiceForLabel(payload: { labelId: string; userIds: string[]; pricePerUser: number; totalAmount?: number; currency?: string; period: 'MONTHLY' | 'YEARLY'; provider?: 'xendit' | 'manual'; description?: string; invoiceNumber?: string; referenceNumber?: string; bankName?: string; paidBy?: string; notes?: string; awaitingApproval?: boolean; additionalSeats?: boolean; }) {
    const { data } = await axiosInstance.post('/subscription/enterprise/label/org-invoice', payload);
    return data;
  },

  // Renewal org invoice based on previous payment (reuses label + userIds stored in metadata)
  async renewOrgInvoice(payload: { previousPaymentId: string; period?: 'MONTHLY' | 'YEARLY'; currency?: string; totalAmount?: number; pricePerUser?: number; provider?: 'xendit' | 'manual'; description?: string; invoiceNumber?: string; referenceNumber?: string; bankName?: string; paidBy?: string; notes?: string; awaitingApproval?: boolean; }) {
    const { data } = await axiosInstance.post('/subscription/enterprise/label/org-invoice/renew', payload);
    return data;
  },

  async approveManualOrgPayment(payload: { paymentId: string }) {
    const { data } = await axiosInstance.post('/subscription/enterprise/label/manual/approve', payload);
    return data;
  },

  async failManualOrgPayment(payload: { paymentId: string; reason?: string; expireSubscriptions?: boolean }) {
    const { data } = await axiosInstance.post('/subscription/enterprise/label/manual/fail', payload);
    return data;
  },

  async listAdminPayments(params: { labelId?: string; status?: string; provider?: string; mode?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params.labelId) query.set('labelId', params.labelId);
    if (params.status) query.set('status', params.status);
    if (params.provider) query.set('provider', params.provider);
    if (params.mode) query.set('mode', params.mode);
    if (params.limit) query.set('limit', String(params.limit));
    const { data } = await axiosInstance.get(`/subscription/payments/admin?${query.toString()}`);
    return data as { items: any[] };
  },

  // Create PayPal billing plan for subscriptions (SUPER_ADMIN only)
  async createBillingPlan(payload: { provider?: 'PAYPAL' | 'XENDIT'; currency?: 'USD' | 'IDR'; plan: 'GOLD_MONTHLY' | 'GOLD_YEARLY' | string; price: number; period?: 'MONTHLY' | 'YEARLY'; name?: string }) {
    const { data } = await axiosInstance.post('/subscription/billing-plan/create', payload);
    return data;
  },

  async updateBillingPlan(id: string, payload: { name?: string; description?: string; price?: number; currency?: 'USD' | 'IDR' | string; period?: 'MONTHLY' | 'YEARLY'; status?: string; plan?: 'GOLD_MONTHLY' | 'GOLD_YEARLY' | 'ENTERPRISE_CUSTOM' | string; provider?: 'PAYPAL' | 'XENDIT' | string }) {
    const { data } = await axiosInstance.put(`/subscription/billing-plan/${id}`, payload);
    return data;
  },

  async deleteBillingPlan(id: string) {
    const { data } = await axiosInstance.delete(`/subscription/billing-plan/${id}`);
    return data;
  },

  async deletePayment(id: string) {
    const { data } = await axiosInstance.delete(`/subscription/payment/${id}`);
    return data as { success: boolean };
  },

  // Unified checkout for subscription and one-time payments
  async checkout(payload: {
    type: 'subscription' | 'one_time';
    plan?: 'TRIAL' | 'GOLD_MONTHLY' | 'GOLD_YEARLY' | 'ENTERPRISE_CUSTOM' | string;
    price?: number;
    currency?: 'IDR' | 'USD';
    provider?: 'xendit' | 'paypal';
    billingPlanId?: string;
    description?: string;
  }) {
    const { data } = await axiosInstance.post('/subscription/payment/checkout', payload);
    return data;
  },

  async checkAccess(tier: 'TRIAL' | 'GOLD_MONTHLY' | 'GOLD_YEARLY' | 'ENTERPRISE_CUSTOM' | string) {
    const { data } = await axiosInstance.get(`/subscription/check-access/${tier}`);
    return data as { hasAccess: boolean } | boolean;
  },

  // Start or refresh a 7-day trial for the current user
  async startTrial() {
    const { data } = await axiosInstance.post('/subscription/trial/start', {});
    return data;
  },
};