"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { subscriptionService } from '@/services/subscription.service';
import { FiPlus, FiCreditCard, FiTag, FiLayers, FiCheck, FiAlertTriangle, FiSearch, FiExternalLink, FiCopy } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { settingsService } from '@/services/settings.service';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionItem {
  id: string;
  dapurUnitId: string;
  plan: string;
  status: string;
  dapurUnit?: {
    id: string;
    name: string;
    location?: string | null;
    projectOwner?: {
      id: string;
      email: string;
      fullname?: string;
      role: string;
      labelInvestors?: Array<{ label: { id: string; name: string } }>;
    };
    adminDapur?: { id: string; email: string; fullname?: string };
    labelDapurs?: Array<{ label: { id: string; name: string } }>;
  };
  startedAt?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  expiresAt?: string;
  label?: { id: string; name: string };
}

//

export default function SubscriptionsAdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isSuperAdmin = user?.user?.role === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const groupedPlans = useMemo(() => {
    const map = new Map<string, { key: string; plan: string; period: string; usd?: any; idr?: any }>();
    (plans || []).forEach((p: any) => {
      const plan = String(p.plan || '').toUpperCase();
      const period = String(p.period || 'MONTHLY').toUpperCase();
      const currency = String(p.currency || '').toUpperCase();
      const key = `${plan}-${period}`;
      if (!map.has(key)) map.set(key, { key, plan, period });
      const entry = map.get(key)!;
      if (currency === 'USD') entry.usd = p;
      if (currency === 'IDR') entry.idr = p;
    });
    return Array.from(map.values());
  }, [plans]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [enterpriseLabels, setEnterpriseLabels] = useState<any[]>([]);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  // removed Bulk Create Investors modal
  const [showBulkSubscribeModal, setShowBulkSubscribeModal] = useState(false);

  // Label management state
  const [labelName, setLabelName] = useState('');
  const [labelDescription, setLabelDescription] = useState('');
  const [createdLabel, setCreatedLabel] = useState<any | null>(null);

  // removed Bulk Create Investors state

  // Bulk subscribe state
  const [selectedLabelId, setSelectedLabelId] = useState('');
  const [selectedDapurUnitIds, setSelectedDapurUnitIds] = useState<string[]>([]);
  const [price, setPrice] = useState<number>(0);
  const [orgTotalMode, setOrgTotalMode] = useState<boolean>(false);
  const [orgTotalAmount, setOrgTotalAmount] = useState<number>(0);
  const [currency, setCurrency] = useState('IDR');
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [autoActivate, setAutoActivate] = useState(true);
  // Billing mode: organization-level invoice vs per-user
  const [billingMode, setBillingMode] = useState<'org_invoice' | 'per_user'>('per_user');
  const [orgProvider, setOrgProvider] = useState<'xendit' | 'manual'>('xendit');
  const [orgPaymentLink, setOrgPaymentLink] = useState<string | null>(null);
  // Manual org-invoice fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [notes, setNotes] = useState('');
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [additionalSeats, setAdditionalSeats] = useState(false);

  const [dapurRows, setDapurRows] = useState<
    Awaited<ReturnType<typeof subscriptionService.getDapurUnitsForEnterpriseLabel>>
  >([]);
  const [dapurSearch, setDapurSearch] = useState('');
  const [loadingDapurs, setLoadingDapurs] = useState(false);

  // Dapur units already on ENTERPRISE_CUSTOM under the selected label (badges in picker)
  const alreadySubscribedSet = useMemo(() => {
    const set = new Set<string>();
    if (!selectedLabelId) return set;
    for (const s of subscriptions) {
      if (s.plan === 'ENTERPRISE_CUSTOM') {
        const lblId = s.label?.id;
        if (lblId === selectedLabelId && s.dapurUnitId) set.add(s.dapurUnitId);
      }
    }
    return set;
  }, [subscriptions, selectedLabelId]);

  const filteredDapurRows = useMemo(() => {
    const q = dapurSearch.trim().toLowerCase();
    if (!q) return dapurRows;
    return dapurRows.filter((row) => {
      const du = row.dapurUnit;
      const emails = [du?.projectOwner?.email, du?.adminDapur?.email].filter(Boolean).join(' ');
      return (
        (du?.name || '').toLowerCase().includes(q) ||
        (du?.location || '').toLowerCase().includes(q) ||
        emails.toLowerCase().includes(q) ||
        (du?.projectOwner?.fullname || '').toLowerCase().includes(q)
      );
    });
  }, [dapurRows, dapurSearch]);

  // Subscriptions table controls
  const [subsSearch, setSubsSearch] = useState('');
  const [subsPlanFilter, setSubsPlanFilter] = useState<string>('');
  const [subsPage, setSubsPage] = useState(1);
  const [subsPageSize, setSubsPageSize] = useState(10);

  // Overview cards pagination (3 rows x 2 cols = 6 per page)
  const [overviewPage, setOverviewPage] = useState(0);

  // Renewal modal state (per user Enterprise Custom)
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<SubscriptionItem | null>(null);
  const [renewPrice, setRenewPrice] = useState<number>(0);
  const [renewCurrency, setRenewCurrency] = useState<'IDR'|'USD'>('IDR');
  const [renewPeriod, setRenewPeriod] = useState<'MONTHLY'|'YEARLY'>('MONTHLY');
  const [renewInvoiceNumber, setRenewInvoiceNumber] = useState('');
  const [renewReferenceNumber, setRenewReferenceNumber] = useState('');
  const [renewBankName, setRenewBankName] = useState('');
  const [renewPaidBy, setRenewPaidBy] = useState('');
  const [renewNotes, setRenewNotes] = useState('');
  const [renewAwaitingApproval, setRenewAwaitingApproval] = useState(true);

  // Platform Bank Settings (persist locally for now)
  const [bankNameSetting, setBankNameSetting] = useState('');
  const [bankAccountNameSetting, setBankAccountNameSetting] = useState('');
  const [bankAccountNumberSetting, setBankAccountNumberSetting] = useState('');
  const [bankInstructionSetting, setBankInstructionSetting] = useState('');

  useEffect(() => {
    const loadBank = async () => {
      try {
        const s = await settingsService.getPlatformBankSettings();
        setBankNameSetting(s.bankName || '');
        setBankAccountNameSetting(s.accountName || '');
        setBankAccountNumberSetting(s.accountNumber || '');
        setBankInstructionSetting(s.instruction || '');
      } catch {}
    };
    loadBank();
  }, []);

  

  // Create Billing Plan state
  const [newPlanType, setNewPlanType] = useState<'TRIAL' | 'GOLD_MONTHLY' | 'GOLD_YEARLY' | 'ENTERPRISE_CUSTOM'>('GOLD_MONTHLY');
  const [newPlanPrice, setNewPlanPrice] = useState<number>(0);
  const [newPlanPeriod, setNewPlanPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  // Billing Plan edit/delete state
  const [planEditOpen, setPlanEditOpen] = useState(false);
  const [planEditGroup, setPlanEditGroup] = useState<{ plan: string; period: 'MONTHLY'|'YEARLY'; usd?: any; idr?: any } | null>(null);
  const [planEditPlan, setPlanEditPlan] = useState<'GOLD_MONTHLY'|'GOLD_YEARLY'|'ENTERPRISE_CUSTOM'|string>('GOLD_MONTHLY');
  const [planEditPeriod, setPlanEditPeriod] = useState<'MONTHLY'|'YEARLY'>('MONTHLY');
  const [planEditName, setPlanEditName] = useState<string>('');
  const [planEditUSD, setPlanEditUSD] = useState<{ price?: string; status?: string; provider?: 'PAYPAL'|'XENDIT'|string; id?: string }>({});
  const [planEditIDR, setPlanEditIDR] = useState<{ price?: string; status?: string; provider?: 'PAYPAL'|'XENDIT'|string; id?: string }>({});
  const [planDeleteId, setPlanDeleteId] = useState<string | null>(null);

  // Enterprise Labels table state
  const [labelsSearch, setLabelsSearch] = useState('');
  const [labelsPage, setLabelsPage] = useState(1);
  const [labelsPageSize, setLabelsPageSize] = useState(10);
  const [labelEditOpen, setLabelEditOpen] = useState(false);
  const [labelToEdit, setLabelToEdit] = useState<any | null>(null);
  const [labelEditForm, setLabelEditForm] = useState<{ name?: string; description?: string }>({});
  const [labelDeleteId, setLabelDeleteId] = useState<string | null>(null);

  // Enterprise labels filtering & pagination
  const filteredLabels = useMemo(() => {
    const q = labelsSearch.trim().toLowerCase();
    if (!q) return enterpriseLabels;
    return enterpriseLabels.filter((l: any) =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.code || '').toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q)
    );
  }, [enterpriseLabels, labelsSearch]);

  const labelsTotalPages = Math.max(1, Math.ceil((filteredLabels?.length || 0) / labelsPageSize));
  const labelsCurrentPage = Math.min(labelsPage, labelsTotalPages);
  const labelsStart = (labelsCurrentPage - 1) * labelsPageSize;
  const labelsEnd = labelsStart + labelsPageSize;
  const pagedLabels = filteredLabels.slice(labelsStart, labelsEnd);

  

  useEffect(() => {
    // Only super admin should fetch admin data
    if (!isSuperAdmin) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [plansRes, subsRes, labelsRes] = await Promise.all([
          subscriptionService.getSubscriptionPlans(),
          subscriptionService.getAllSubscriptions(),
          subscriptionService.getEnterpriseLabels(),
        ]);
        setPlans(plansRes || []);
        setSubscriptions(subsRes || []);
        setEnterpriseLabels(labelsRes || []);
      } catch (error: any) {
        console.error('Failed to load subscription data:', error);
        toast.error(error?.response?.data?.message || 'Gagal memuat data langganan');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isSuperAdmin]);

  

  // removed Bulk Create parsing effect

  // Format plan label for display
  const formatPlanLabel = (val: string) => {
    if (!val) return '-';
    const map: Record<string, string> = {
      GOLD_MONTHLY: 'Gold Monthly',
      GOLD_YEARLY: 'Gold Yearly',
      ENTERPRISE_CUSTOM: 'Enterprise Custom',
      TRIAL: 'Trial',
    };
    if (map[val]) return map[val];
    return val.toLowerCase().split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  };

  useEffect(() => {
    const loadDapurs = async () => {
      if (!showBulkSubscribeModal || !selectedLabelId) {
        setDapurRows([]);
        return;
      }
      setLoadingDapurs(true);
      try {
        const rows = await subscriptionService.getDapurUnitsForEnterpriseLabel(selectedLabelId);
        setDapurRows(rows || []);
      } catch (e: any) {
        console.error('Load dapur units for label failed', e);
        setDapurRows([]);
      } finally {
        setLoadingDapurs(false);
      }
    };
    loadDapurs();
  }, [showBulkSubscribeModal, selectedLabelId]);

  const getEndStr = (s: SubscriptionItem) => s.status === 'TRIAL' ? (s.trialEndsAt || s.expiresAt) : (s.currentPeriodEnd || s.expiresAt);
  const isExpiredSub = (s: SubscriptionItem) => {
    const endStr = getEndStr(s);
    if (!endStr) return false;
    return new Date(endStr).getTime() < Date.now();
  };

  const subscriptionStats = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter(s => s.status === 'ACTIVE' && !isExpiredSub(s)).length;
    // Expiring soon: ENTERPRISE_CUSTOM and end within 24h
    const expiringSoon = subscriptions.filter(s => {
      if (s.plan !== 'ENTERPRISE_CUSTOM') return false;
      const endStr = getEndStr(s);
      if (!endStr) return false;
      const endMs = new Date(endStr).getTime();
      const msLeft = endMs - Date.now();
      return msLeft > 0 && msLeft <= 24 * 60 * 60 * 1000;
    }).length;
    const canceled = subscriptions.filter(s => s.status === 'CANCELED').length;
    return { total, active, expiringSoon, canceled };
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    const q = subsSearch.trim().toLowerCase();
    return subscriptions.filter((s) => {
      const byPlan = subsPlanFilter ? s.plan === subsPlanFilter : true;
      const owner = s.dapurUnit?.projectOwner;
      const byQuery = !q
        ? true
        : (
            (s.dapurUnit?.name?.toLowerCase().includes(q)) ||
            (s.dapurUnit?.location?.toLowerCase?.().includes(q)) ||
            (owner?.email?.toLowerCase().includes(q)) ||
            (owner?.fullname?.toLowerCase?.().includes(q)) ||
            (s.label?.name?.toLowerCase().includes(q)) ||
            (formatPlanLabel(s.plan).toLowerCase().includes(q)) ||
            (s.status?.toLowerCase().includes(q))
          );
      return byPlan && byQuery;
    });
  }, [subscriptions, subsSearch, subsPlanFilter]);

  const subsTotalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / subsPageSize));
  const subsCurrentPage = Math.min(subsPage, subsTotalPages);
  const subsStart = (subsCurrentPage - 1) * subsPageSize;
  const subsEnd = subsStart + subsPageSize;
  const pagedSubscriptions = filteredSubscriptions.slice(subsStart, subsEnd);

  const handleCreateLabel = async () => {
    if (!labelName.trim()) {
      toast.warn('Nama label wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const res = await subscriptionService.createEnterpriseLabel({ name: labelName.trim(), description: labelDescription.trim() || undefined });
      setCreatedLabel(res);
      toast.success('Label enterprise berhasil dibuat');
      setShowCreateLabelModal(false);
      // refresh labels
      try {
        const labelsRes = await subscriptionService.getEnterpriseLabels();
        setEnterpriseLabels(labelsRes || []);
      } catch {}
    } catch (error: any) {
      console.error('Create label error:', error);
      toast.error(error?.response?.data?.message || 'Gagal membuat label');
    } finally {
      setLoading(false);
    }
  };

  // Renew Enterprise Custom for a single user (manual org invoice via label)
  const handleRenewSubmit = async () => {
    if (!renewTarget) return;
    const labelId = renewTarget.label?.id;
    const dapurId = renewTarget.dapurUnitId || renewTarget.dapurUnit?.id;
    if (!labelId || !dapurId) {
      toast.warn('Label atau unit dapur tidak ditemukan untuk subscription ini');
      return;
    }
    if (renewPrice <= 0) {
      toast.warn('Harga harus lebih besar dari 0');
      return;
    }
    setLoading(true);
    try {
      const res = await subscriptionService.createOrgInvoiceForLabel({
        labelId,
        dapurUnitIds: [dapurId],
        pricePerUser: renewPrice,
        currency: renewCurrency,
        period: renewPeriod,
        provider: 'manual',
        description: `Enterprise Custom ${renewPeriod} renewal - ${renewTarget.dapurUnit?.name || dapurId}`,
        invoiceNumber: renewInvoiceNumber || undefined,
        referenceNumber: renewReferenceNumber || undefined,
        bankName: renewBankName || undefined,
        paidBy: renewPaidBy || undefined,
        notes: (function(){
          const bankInfo = [
            bankNameSetting ? `Bank: ${bankNameSetting}` : '',
            bankAccountNameSetting ? `Account Name: ${bankAccountNameSetting}` : '',
            bankAccountNumberSetting ? `Account Number: ${bankAccountNumberSetting}` : '',
            bankInstructionSetting ? `Instruction: ${bankInstructionSetting}` : ''
          ].filter(Boolean).join('\n');
          const finalNotes = [renewNotes, bankInfo].filter(Boolean).join('\n\n');
          return finalNotes || undefined;
        })(),
        awaitingApproval: renewAwaitingApproval,
        additionalSeats: false,
      });
      const link = res?.paymentLink || res?.payment_link || res?.approval_url || res?.metadata?.invoiceUrl;
      if (link) {
        toast.success('Invoice renewal dibuat');
        window.open(link, '_blank');
      } else {
        toast.success('Invoice renewal dibuat (manual)');
      }
      setRenewOpen(false);
      setRenewTarget(null);
      try {
        const subsRes = await subscriptionService.getAllSubscriptions();
        setSubscriptions(subsRes || []);
      } catch {}
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal membuat invoice renewal');
    } finally {
      setLoading(false);
    }
  };

  // removed Bulk Create handler

  const handleBulkSubscribe = async () => {
    if (!selectedLabelId) {
      toast.warn('Label belum dipilih');
      return;
    }
    if (selectedDapurUnitIds.length === 0) {
      toast.warn('Pilih minimal satu unit dapur');
      return;
    }
    if (price <= 0) {
      toast.warn('Harga harus lebih besar dari 0');
      return;
    }
    setLoading(true);
    try {
      if (billingMode === 'org_invoice') {
        const res = await subscriptionService.createOrgInvoiceForLabel({
          labelId: selectedLabelId,
          dapurUnitIds: selectedDapurUnitIds,
          pricePerUser: orgTotalMode ? 0 : price,
          totalAmount: orgTotalMode ? orgTotalAmount : undefined,
          currency,
          period,
          provider: orgProvider,
          description: `Enterprise Custom ${period} - ${selectedDapurUnitIds.length} unit dapur`,
          // manual fields (invoice number auto-generated; reference set later at approval)
          paidBy: orgProvider === 'manual' ? paidBy || undefined : undefined,
          notes: (function(){
            if (orgProvider !== 'manual') return undefined;
            const bankInfo = [
              bankNameSetting ? `Bank: ${bankNameSetting}` : '',
              bankAccountNameSetting ? `Account Name: ${bankAccountNameSetting}` : '',
              bankAccountNumberSetting ? `Account Number: ${bankAccountNumberSetting}` : '',
              bankInstructionSetting ? `Instruction: ${bankInstructionSetting}` : ''
            ].filter(Boolean).join('\n');
            const finalNotes = [notes, bankInfo].filter(Boolean).join('\n\n');
            return finalNotes || undefined;
          })(),
          awaitingApproval: orgProvider === 'manual' ? awaitingApproval : undefined,
          additionalSeats: orgProvider === 'manual' ? additionalSeats : undefined,
        });
        const link = res?.paymentLink || res?.payment_link || res?.approval_url || res?.metadata?.invoiceUrl || (res?.id ? `${window.location.origin}/api/subscription/payment/${res.id}/invoice/html` : null);
        setOrgPaymentLink(link || null);
        if (orgProvider === 'manual') {
          if (awaitingApproval) {
            toast.success('Invoice manual dibuat dan menunggu approval. User belum diaktifkan.');
          } else {
            // Backend forces awaitingApproval for manual, but keep fallback
            toast.success('Invoice manual dibuat.');
          }
        } else {
          toast.success('Invoice organisasi berhasil dibuat');
        }
        // Auto-close modal after successful creation
        setShowBulkSubscribeModal(false);
      } else {
        const res = await subscriptionService.bulkSubscribeDapursForLabel({
          labelId: selectedLabelId,
          dapurUnitIds: selectedDapurUnitIds,
          price,
          currency,
          period,
          autoActivate,
        });
        toast.success(`Berhasil subscribe ${res.count} unit dapur`);
        setShowBulkSubscribeModal(false);
      }
    } catch (error: any) {
      console.error('Bulk subscribe error:', error);
      toast.error(error?.response?.data?.message || 'Gagal melakukan subscribe massal');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBillingPlan = async () => {
    if (newPlanType === 'TRIAL') {
      toast.info('Plan TRIAL tidak memerlukan pembuatan billing plan.');
      return;
    }
    if (newPlanType === 'ENTERPRISE_CUSTOM') {
      toast.info('Plan ENTERPRISE_CUSTOM dikelola melalui Bulk Subscribe Label dengan harga khusus, bukan billing plan PayPal.');
      return;
    }
    if (newPlanPrice <= 0) {
      toast.warn('Harga plan harus lebih besar dari 0');
      return;
    }
    setLoading(true);
    try {
      const res = await subscriptionService.createBillingPlan({ plan: newPlanType, price: newPlanPrice, period: newPlanPeriod });
      toast.success(`Billing plan dibuat: ${res?.name || newPlanType}`);
      try {
        const refreshed = await subscriptionService.getSubscriptionPlans();
        setPlans(refreshed || plans);
      } catch {}
    } catch (error: any) {
      console.error('Create billing plan error:', error);
      toast.error(error?.response?.data?.message || 'Gagal membuat billing plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.SUPER_ADMIN]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Subscriptions Management</h1>
        </div>

        

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center text-blue-600"><FiLayers className="mr-2" /> Total</div>
            <div className="text-3xl font-semibold mt-2 text-black">{subscriptionStats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center text-green-600"><FiCheck className="mr-2" /> Active</div>
            <div className="text-3xl font-semibold mt-2 text-black">{subscriptionStats.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center text-yellow-600"><FiAlertTriangle className="mr-2" /> Expiring Soon</div>
            <div className="text-3xl font-semibold mt-2 text-black">{subscriptionStats.expiringSoon}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center text-red-600"><FiCreditCard className="mr-2" /> Canceled</div>
            <div className="text-3xl font-semibold mt-2 text-black">{subscriptionStats.canceled}</div>
          </div>
        </div>

        {/* Highlight Recent/Active Subscriptions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold flex items-center text-black"><FiCreditCard className="mr-2" /> Subscriptions Overview</h2>
            <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
              <button onClick={() => setShowCreateLabelModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm rounded flex items-center"><FiTag className="mr-2" /> Create Label</button>
              <button onClick={() => { setOrgPaymentLink(null); setBillingMode('per_user'); setOrgProvider('xendit'); setInvoiceNumber(''); setReferenceNumber(''); setBankName(''); setPaidBy(''); setNotes(''); setAwaitingApproval(false); setAdditionalSeats(false); setSelectedDapurUnitIds([]); setDapurSearch(''); setShowBulkSubscribeModal(true); }} className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm rounded flex items-center"><FiCreditCard className="mr-2" /> Bulk Subscribe</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscriptions.slice(overviewPage * 6, overviewPage * 6 + 6).map((s) => {
              const endStr = getEndStr(s);
              const endMs = endStr ? new Date(endStr).getTime() : undefined;
              const msLeft = endMs ? (endMs - Date.now()) : undefined;
              const expiringSoon = s.plan === 'ENTERPRISE_CUSTOM' && typeof msLeft === 'number' && msLeft > 0 && msLeft <= 24 * 60 * 60 * 1000;
              const expired = isExpiredSub(s);
              return (
                <div key={s.id} className={`rounded-lg border p-4 ${expired ? 'bg-gray-50 border-gray-300' : s.status === 'ACTIVE' ? 'bg-green-50 border-green-200' : s.status === 'TRIAL' ? 'bg-yellow-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-900 truncate">
                      <div className="font-semibold text-black truncate">{s.dapurUnit?.name || 'Unit dapur'}</div>
                      <div className="text-xs text-gray-600 truncate">
                        {s.dapurUnit?.projectOwner?.fullname || s.dapurUnit?.projectOwner?.email || '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expiringSoon && !expired && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">Expiring soon</span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${expired ? 'bg-red-100 text-red-700' : s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : s.status === 'TRIAL' ? 'bg-amber-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{expired ? 'EXPIRED' : s.status}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">Plan: <span className="font-semibold text-gray-900">{formatPlanLabel(s.plan)}</span></div>
                  <div className="text-xs text-gray-600 mt-1">Label: <span className="font-semibold text-gray-900">{s.label?.name || '-'}</span></div>
                  <div className="text-xs text-gray-600 mt-1">Period End: {endStr ? new Date(endStr).toLocaleDateString() : '-'}</div>
                  {(s.plan === 'ENTERPRISE_CUSTOM' && expired) && (
                    <div className="mt-2">
                      <button onClick={() => { setRenewTarget(s); setRenewOpen(true); setRenewPrice(0); setRenewCurrency('IDR'); setRenewPeriod('MONTHLY'); setRenewInvoiceNumber(''); setRenewReferenceNumber(''); setRenewBankName(''); setRenewPaidBy(''); setRenewNotes(''); setRenewAwaitingApproval(true); }} className="text-xs px-2 py-1 rounded bg-slate-900 text-white hover:bg-slate-800">Renew</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Overview pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-black">
            <div>
              Page <span className="font-medium">{overviewPage + 1}</span> of <span className="font-medium">{Math.max(1, Math.ceil(subscriptions.length / 6))}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                disabled={overviewPage <= 0}
                onClick={() => setOverviewPage(p => Math.max(0, p - 1))}
              >Prev</button>
              <button
                className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
                disabled={(overviewPage + 1) >= Math.max(1, Math.ceil(subscriptions.length / 6))}
                onClick={() => setOverviewPage(p => p + 1)}
              >Next</button>
            </div>
          </div>
        </div>

        {/* Plans list as Cards */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold flex items-center text-black"><FiTag className="mr-2" /> Billing Plans</h2>
            <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
              <button onClick={() => router.push('/dashboard/subscriptions/create-billing-plan')} className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 text-xs md:px-3 md:py-2 md:text-sm rounded flex items-center"><FiPlus className="mr-2" /> Create Billing Plan</button>
            </div>
          </div>
          {(!plans || plans.length === 0) ? (
            <div className="p-6 text-center text-gray-600">Tidak ada billing plan</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {groupedPlans.map((g) => (
                <div key={g.key} className="border rounded-lg p-4 hover:shadow transition">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold text-gray-900">{formatPlanLabel(g.plan)} • {g.period}</div>
                  </div>
                  <div className="mt-3 text-sm text-gray-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs px-2 py-0.5 rounded bg-yellow-50 text-amber-800 border border-amber-200">IDR</span>
                      <span className="font-medium">{g.idr ? `${(typeof g.idr.price === 'number' ? g.idr.price.toLocaleString() : g.idr.price)} IDR` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">USD</span>
                      <span className="font-medium">{g.usd ? `${(typeof g.usd.price === 'number' ? g.usd.price.toLocaleString() : g.usd.price)} USD` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Providers</span>
                      <span className="text-xs">{[g.idr?.provider, g.usd?.provider].filter(Boolean).join(' / ') || '-'}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button className="px-3 py-1.5 rounded border text-xs hover:bg-gray-50" onClick={() => {
                        const pickInternalId = (p:any) => {
                          if (!p) return undefined;
                          const iid = p.internalId || p._id || p.id;
                          // Avoid passing PayPal providerPlanId like 'P-...'
                          if (typeof iid === 'string' && iid.startsWith('P-')) return undefined;
                          return iid;
                        };
                        setPlanEditGroup({ plan: g.plan, period: g.period as any, usd: g.usd, idr: g.idr });
                        setPlanEditPlan(g.plan as any);
                        setPlanEditPeriod(g.period as any);
                        setPlanEditName(g.usd?.name || g.idr?.name || '');
                        setPlanEditUSD({ id: pickInternalId(g.usd), price: g.usd ? String(g.usd.price ?? '') : '', status: g.usd?.status, provider: g.usd?.provider });
                        setPlanEditIDR({ id: pickInternalId(g.idr), price: g.idr ? String(g.idr.price ?? '') : '', status: g.idr?.status, provider: g.idr?.provider });
                        setPlanEditOpen(true);
                      }}>Edit</button>
                      {(() => {
                        const iidUSD = (g.usd && (g.usd.internalId || g.usd._id || (typeof g.usd.id==='string' && g.usd.id.startsWith('P-') ? undefined : g.usd.id)));
                        const iidIDR = (g.idr && (g.idr.internalId || g.idr._id || (typeof g.idr.id==='string' && g.idr.id.startsWith('P-') ? undefined : g.idr.id)));
                        const ids = [iidUSD, iidIDR].filter(Boolean).map(String);
                        return ids.length > 0 ? (
                          <button className="px-3 py-1.5 rounded border text-xs hover:bg-red-50 text-red-700" onClick={() => setPlanDeleteId(ids.join(','))}>Delete</button>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        {showBulkSubscribeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3" onClick={() => setShowBulkSubscribeModal(false)}>
            <div className="bg-white rounded-xl max-w-3xl w-full shadow-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b text-black text-base font-semibold">Bulk Subscribe</div>
              <div className="px-4 py-3 space-y-3 overflow-auto flex-1">
                {orgPaymentLink && (
                  <div className="p-3 rounded border border-purple-200 bg-slate-50 text-sm text-black flex items-center justify-between">
                    <div>
                      <div className="font-medium">Invoice organisasi berhasil dibuat</div>
                      <div className="text-xs text-gray-700 break-all">{orgPaymentLink}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={orgPaymentLink} target="_blank" rel="noreferrer" className="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-900 text-white hover:bg-slate-800"><FiExternalLink className="mr-1" /> Buka</a>
                      <button onClick={() => { navigator.clipboard.writeText(orgPaymentLink!); toast.success('Link disalin'); }} className="inline-flex items-center px-2 py-1 rounded text-xs border hover:bg-gray-50"><FiCopy className="mr-1" /> Salin</button>
                    </div>
                  </div>
                )}
                {/* Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Row: Mode & Provider (full width) */}
                  <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2">
                    <label className="text-sm text-black">Mode</label>
                    <select value={billingMode} onChange={(e) => setBillingMode(e.target.value as any)} className="border rounded px-2 py-1.5 text-sm text-black">
                      <option value="per_user">Per unit dapur (invoice/pembayaran per dapur)</option>
                      <option value="org_invoice">Organization pays (satu invoice)</option>
                    </select>
                    {billingMode === 'org_invoice' && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-black">Provider</label>
                        <select value={orgProvider} onChange={(e) => { const v = e.target.value as any; setOrgProvider(v); if (v === 'manual') setAwaitingApproval(true); }} className="border rounded px-2 py-1.5 text-sm text-black">
                          <option value="xendit">Xendit</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Row: Filters & Pricing */}
                  <div className="min-w-0 sm:col-span-2">
                    <select
                      value={selectedLabelId}
                      onChange={(e) => {
                        setSelectedLabelId(e.target.value);
                        setSelectedDapurUnitIds([]);
                      }}
                      className="w-full border rounded px-2 py-1.5 text-sm text-black"
                    >
                      <option value="">Pilih Label</option>
                      {enterpriseLabels.map((label: any) => (
                        <option key={label.id} value={label.id}>{label.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <input
                      value={dapurSearch}
                      onChange={(e) => setDapurSearch(e.target.value)}
                      disabled={!selectedLabelId}
                      className="w-full border rounded px-2 py-1.5 text-sm text-black disabled:bg-gray-100"
                      placeholder={selectedLabelId ? 'Cari nama dapur / lokasi / email pemilik' : 'Pilih label terlebih dahulu'}
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <input value={price} onChange={(e) => setPrice(Number(e.target.value))} type="number" className="w-full border rounded px-2 py-1.5 text-sm text-black" placeholder="Price" />
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="border rounded px-2 py-1.5 text-sm text-black">
                      <option value="IDR">IDR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div className="min-w-0">
                    <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="w-full border rounded px-2 py-1.5 text-sm text-black">
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  {billingMode === 'per_user' && (
                    <label className="flex items-center space-x-2 text-sm text-black">
                      <input type="checkbox" checked={autoActivate} onChange={(e) => setAutoActivate(e.target.checked)} />
                      <span>Auto activate</span>
                    </label>
                  )}
                </div>

                {billingMode === 'org_invoice' && orgProvider === 'manual' && (
                  <div className="border rounded p-3 space-y-3 bg-gray-50">
                    <div className="text-sm font-medium text-black">Detail Invoice Manual</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="block text-xs text-gray-600 mb-1">Paid By</label>
                        <input value={paidBy} onChange={(e)=>setPaidBy(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-black" placeholder="PIC / Company" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">Notes</label>
                        <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-black h-20" placeholder="Catatan internal (opsional)" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <label className="inline-flex items-center gap-2 text-sm text-black">
                        <input type="checkbox" checked={awaitingApproval} onChange={(e)=>setAwaitingApproval(e.target.checked)} />
                        <span>Tunda aktivasi hingga pembayaran</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-black">
                  <div>
                    <span className="text-gray-600">Dipilih:</span>{' '}
                    <span className="font-medium">{selectedDapurUnitIds.length} unit dapur</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Total</span>
                    <span className="font-semibold">
                      {(orgTotalMode ? orgTotalAmount : price * selectedDapurUnitIds.length).toLocaleString()} {currency}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded">
                    <div className="p-2 border-b text-sm font-medium text-black">Unit dapur (LabelDapur)</div>
                    <div className="max-h-60 overflow-auto">
                      {!selectedLabelId ? (
                        <div className="p-2 text-sm text-gray-600">Pilih label untuk memuat daftar dapur.</div>
                      ) : loadingDapurs ? (
                        <div className="p-2 text-sm text-gray-600">Memuat unit dapur…</div>
                      ) : filteredDapurRows.length === 0 ? (
                        <div className="p-2 text-sm text-gray-600">
                          Tidak ada dapur di label ini. Hubungkan dapur ke label (LabelDapur) terlebih dahulu.
                        </div>
                      ) : (
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="p-2 text-black">Pilih</th>
                              <th className="p-2 text-black">Dapur</th>
                              <th className="p-2 text-black">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDapurRows.map((row) => {
                              const du = row.dapurUnit;
                              const id = row.dapurUnitId;
                              const checked = selectedDapurUnitIds.includes(id);
                              const already = alreadySubscribedSet.has(id);
                              return (
                                <tr key={row.id} className="border-t">
                                  <td className="p-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedDapurUnitIds((prev) => Array.from(new Set([...prev, id])));
                                        } else {
                                          setSelectedDapurUnitIds((prev) => prev.filter((x) => x !== id));
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="p-2 text-black">
                                    <div className="font-medium">{du?.name || id}</div>
                                    <div className="text-xs text-gray-600">
                                      {du?.projectOwner?.email || '—'}
                                      {du?.location ? ` · ${du.location}` : ''}
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    {already && (
                                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 border border-green-200">
                                        Subscribed
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className="p-2 flex items-center justify-between text-xs text-gray-600">
                      <span>Terhubung ke label: {dapurRows.length}</span>
                    </div>
                  </div>
                  <div className="border rounded">
                    <div className="p-2 border-b text-sm font-medium text-black">Dipilih ({selectedDapurUnitIds.length})</div>
                    <div className="max-h-60 overflow-auto">
                      {selectedDapurUnitIds.length === 0 ? (
                        <div className="p-2 text-sm text-gray-600">Belum ada unit dapur dipilih</div>
                      ) : (
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="p-2 text-black">ID</th>
                              <th className="p-2 text-black">Nama</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDapurUnitIds.map((id) => {
                              const row = dapurRows.find((r) => r.dapurUnitId === id);
                              return (
                                <tr key={id} className="border-t">
                                  <td className="p-2 text-black font-mono text-xs">{id}</td>
                                  <td className="p-2 text-black">{row?.dapurUnit?.name || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t flex items-center justify-end space-x-2">
                <button onClick={() => setShowBulkSubscribeModal(false)} className="px-3 py-1.5 rounded border text-sm text-gray-700 hover:bg-gray-50">Batal</button>
                <button onClick={handleBulkSubscribe} className="px-3 py-1.5 rounded text-sm bg-slate-900 text-white hover:bg-slate-800">Subscribe</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Billing Plan Modal (Dual) */}
        {planEditOpen && planEditGroup && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3" onClick={()=> setPlanEditOpen(false)}>
            <div className="bg-white rounded-xl w-full max-w-md shadow" onClick={(e)=> e.stopPropagation()}>
              <div className="px-4 py-3 border-b text-black font-semibold">Edit Billing Plan</div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Plan</label>
                    <select className="w-full border rounded px-3 py-2 text-sm text-black" value={planEditPlan} onChange={(e)=> setPlanEditPlan(e.target.value as any)}>
                      <option value="GOLD_MONTHLY">GOLD_MONTHLY</option>
                      <option value="GOLD_YEARLY">GOLD_YEARLY</option>
                      <option value="ENTERPRISE_CUSTOM">ENTERPRISE_CUSTOM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Period</label>
                    <select className="w-full border rounded px-3 py-2 text-sm text-black" value={planEditPeriod} onChange={(e)=> setPlanEditPeriod(e.target.value as any)}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Name (optional)</label>
                  <input className="w-full border rounded px-3 py-2 text-sm text-black" value={planEditName} onChange={(e)=> setPlanEditName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-800 mb-1">USD • PayPal</div>
                    <label className="block text-xs text-gray-600 mb-1">Price (USD)</label>
                    <input type="number" className="w-full border rounded px-3 py-2 text-sm text-black" value={planEditUSD.price || ''} onChange={(e)=> setPlanEditUSD(p=> ({...p, price: e.target.value}))} />
                    <label className="block text-xs text-gray-600 mb-1 mt-2">Status</label>
                    <select className="w-full border rounded px-3 py-2 text-sm text-black" value={planEditUSD.status || ''} onChange={(e)=> setPlanEditUSD(p=> ({...p, status: e.target.value}))}>
                      <option value="">-</option>
                      <option value="CREATED">CREATED</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-800 mb-1">IDR • Xendit</div>
                    <label className="block text-xs text-gray-600 mb-1">Price (IDR)</label>
                    <input type="number" className="w-full border rounded px-3 py-2 text-sm text-black" value={planEditIDR.price || ''} onChange={(e)=> setPlanEditIDR(p=> ({...p, price: e.target.value}))} />
                    <label className="block text-xs text-gray-600 mb-1 mt-2">Status</label>
                    <select className="w-full border rounded px-3 py-2 text-sm text-black" value={planEditIDR.status || ''} onChange={(e)=> setPlanEditIDR(p=> ({...p, status: e.target.value}))}>
                      <option value="">-</option>
                      <option value="CREATED">CREATED</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 rounded border text-sm text-red-600" onClick={()=> setPlanEditOpen(false)}>Cancel</button>
                <button className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm" onClick={async ()=> {
                  try {
                    // Track operations
                    let usdOk = true;
                    let idrOk = true;

                    // USD: update or create
                    if (planEditUSD.price && Number(planEditUSD.price) > 0) {
                      try {
                        if (planEditUSD.id) {
                          await subscriptionService.updateBillingPlan(planEditUSD.id, { name: planEditName || undefined, price: Number(planEditUSD.price), currency: 'USD', status: planEditUSD.status || undefined, plan: planEditPlan, period: planEditPeriod, provider: 'PAYPAL' });
                        } else {
                          const createdUSD: any = await subscriptionService.createBillingPlan({ provider: 'PAYPAL', currency: 'USD', plan: planEditPlan as any, price: Number(planEditUSD.price), period: planEditPeriod, name: planEditName || undefined } as any);
                          const createdUSDId = createdUSD?.id || createdUSD?._id || createdUSD?.data?.id;
                          console.debug('Created USD billing plan:', createdUSD);
                          if (createdUSDId) {
                            await subscriptionService.updateBillingPlan(createdUSDId, { status: (planEditUSD.status || 'ACTIVE') as any });
                          }
                        }
                      } catch (e:any) {
                        usdOk = false;
                        toast.error(e?.response?.data?.message || 'Gagal menyimpan USD');
                      }
                    }

                    // IDR: update or create (with provider compatibility fallback)
                    if (planEditIDR.price && Number(planEditIDR.price) > 0) {
                      try {
                        if (planEditIDR.id) {
                          await subscriptionService.updateBillingPlan(planEditIDR.id, { name: planEditName || undefined, price: Number(planEditIDR.price), currency: 'IDR', status: planEditIDR.status || undefined, plan: planEditPlan, period: planEditPeriod, provider: 'XENDIT' });
                        } else {
                          try {
                            const createdIDR1: any = await subscriptionService.createBillingPlan({ provider: 'XENDIT', currency: 'IDR', plan: planEditPlan as any, price: Number(planEditIDR.price), period: planEditPeriod, name: planEditName || undefined } as any);
                            const createdIDR1Id = createdIDR1?.id || createdIDR1?._id || createdIDR1?.data?.id;
                            console.debug('Created IDR billing plan (with provider):', createdIDR1);
                            if (createdIDR1Id) {
                              await subscriptionService.updateBillingPlan(createdIDR1Id, { status: (planEditIDR.status || 'ACTIVE') as any });
                            }
                          } catch (err1:any) {
                            console.debug('Create IDR with provider failed, retrying without provider...', err1?.response?.data || err1);
                            const createdIDR2: any = await subscriptionService.createBillingPlan({ currency: 'IDR', plan: planEditPlan as any, price: Number(planEditIDR.price), period: planEditPeriod, name: planEditName || undefined } as any);
                            const createdIDR2Id = createdIDR2?.id || createdIDR2?._id || createdIDR2?.data?.id;
                            console.debug('Created IDR billing plan (no provider):', createdIDR2);
                            if (createdIDR2Id) {
                              await subscriptionService.updateBillingPlan(createdIDR2Id, { status: (planEditIDR.status || 'ACTIVE') as any });
                            }
                          }
                        }
                      } catch (e:any) {
                        idrOk = false;
                        toast.error(e?.response?.data?.message || 'Gagal menyimpan IDR');
                      }
                    }

                    const refreshed = await subscriptionService.getSubscriptionPlans();
                    setPlans(refreshed || plans);

                    // Verify presence in refreshed list
                    const key = `${String(planEditPlan).toUpperCase()}-${String(planEditPeriod).toUpperCase()}`;
                    const verifyMap = new Map<string, { usd?: any; idr?: any }>();
                    (refreshed || []).forEach((p:any) => {
                      const k = `${String(p.plan||'').toUpperCase()}-${String(p.period||'').toUpperCase()}`;
                      if (!verifyMap.has(k)) verifyMap.set(k, {});
                      const e = verifyMap.get(k)!;
                      const cur = String(p.currency||'').toUpperCase();
                      if (cur === 'USD') e.usd = p;
                      if (cur === 'IDR') e.idr = p;
                    });
                    const present = verifyMap.get(key) || {};

                    if (planEditUSD.price && Number(planEditUSD.price) > 0 && !present.usd) {
                      usdOk = false;
                    }
                    if (planEditIDR.price && Number(planEditIDR.price) > 0 && !present.idr) {
                      idrOk = false;
                    }

                    if (usdOk && idrOk) {
                      toast.success('Billing plan berhasil disimpan');
                      setPlanEditOpen(false);
                    } else {
                      if (!usdOk) toast.warn('Harga USD belum tersimpan di server. Cek konfigurasi PayPal.');
                      if (!idrOk) toast.warn('Harga IDR belum tersimpan di server. Cek dukungan endpoint untuk Xendit/IDR.');
                    }

                    // If user changed Plan/Period from the original group, inform the new card location
                    if (planEditGroup && (String(planEditGroup.plan).toUpperCase() !== String(planEditPlan).toUpperCase() || String(planEditGroup.period).toUpperCase() !== String(planEditPeriod).toUpperCase())) {
                      toast.info('Perhatian: Plan/Period diubah. Harga tersimpan pada kartu kelompok baru.');
                    }
                  } catch (e:any) {
                    toast.error(e?.response?.data?.message || 'Gagal update plan');
                  }
                }}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm delete plan */}
        {planDeleteId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3" onClick={()=> setPlanDeleteId(null)}>
            <div className="bg-white rounded-xl w-full max-w-sm shadow" onClick={(e)=> e.stopPropagation()}>
              <div className="px-4 py-3 border-b text-black font-semibold">Delete Plan</div>
              <div className="p-4 text-sm text-black">Yakin ingin menghapus billing plan ini?</div>
              <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 rounded border text-sm text-red-800" onClick={()=> setPlanDeleteId(null)}>Cancel</button>
                <button className="px-3 py-1.5 rounded bg-red-600 text-white text-sm" onClick={async ()=> {
                  try {
                    const ids = String(planDeleteId || '').split(',').map(s => s.trim()).filter(Boolean);
                    for (const id of ids) {
                      await subscriptionService.deleteBillingPlan(id);
                    }
                    const refreshed = await subscriptionService.getSubscriptionPlans();
                    setPlans(refreshed || plans);
                    setPlanDeleteId(null);
                  } catch (e:any) {
                    toast.error(e?.response?.data?.message || 'Gagal menghapus plan');
                  }
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Subscriptions table */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center text-black"><FiCreditCard className="mr-2" /> Subscriptions</h2>
          </div>
          {/* Table controls: search, filter by plan, page size */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center border rounded px-2 py-1.5 text-sm text-black">
              <FiSearch className="mr-2 text-gray-500" />
              <input value={subsSearch} onChange={(e)=>{ setSubsSearch(e.target.value); setSubsPage(1);} } placeholder="Cari dapur, email pemilik, label, plan, status" className="outline-none" />
            </div>
            <select value={subsPlanFilter} onChange={(e)=>{ setSubsPlanFilter(e.target.value); setSubsPage(1);} } className="border rounded px-2 py-1.5 text-sm text-black">
              <option value="">All Plans</option>
              <option value="TRIAL">Trial</option>
              <option value="GOLD_MONTHLY">Gold Monthly</option>
              <option value="GOLD_YEARLY">Gold Yearly</option>
              <option value="ENTERPRISE_CUSTOM">Enterprise Custom</option>
            </select>
            <select value={String(subsPageSize)} onChange={(e)=>{ setSubsPageSize(parseInt(e.target.value)); setSubsPage(1);} } className="border rounded px-2 py-1.5 text-sm text-black">
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2 text-black">Dapur / Pemilik</th>
                  <th className="p-2 text-black">Plan</th>
                  <th className="p-2 text-black">Status</th>
                  <th className="p-2 text-black">Label</th>
                  <th className="p-2 text-black">Period End</th>
                  <th className="p-2 text-black">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-600">Tidak ada data subscriptions</td></tr>
                ) : (
                  pagedSubscriptions.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 text-black">
                        <div className="font-medium">{s.dapurUnit?.name || '—'}</div>
                        <div className="text-xs text-gray-600">
                          {s.dapurUnit?.projectOwner?.fullname || s.dapurUnit?.projectOwner?.email || '—'}
                        </div>
                      </td>
                      <td className="p-2 text-black">
                        {(() => {
                          const planBadgeClass =
                            s.plan === 'ENTERPRISE_CUSTOM'
                              ? 'bg-slate-100 text-amber-700'
                              : (s.plan === 'GOLD_MONTHLY' || s.plan === 'GOLD_YEARLY')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700';
                          return (
                            <span className={`inline-block px-2 py-1 rounded text-xs font-mono ${planBadgeClass}`}>{formatPlanLabel(s.plan)}</span>
                          );
                        })()}
                      </td>
                      <td className="p-2 text-black">
                        {(() => {
                          const endStr = s.status === 'TRIAL' ? (s.trialEndsAt || s.expiresAt) : (s.currentPeriodEnd || s.expiresAt);
                          const expired = endStr ? new Date(endStr).getTime() < Date.now() : false;
                          const derived = expired ? 'EXPIRED' : s.status;
                          const cls = derived === 'EXPIRED'
                            ? 'bg-red-100 text-red-700'
                            : derived === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : derived === 'TRIAL'
                                ? 'bg-amber-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700';
                          return (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs border ${cls}`}>{derived}</span>
                          );
                        })()}
                      </td>
                      <td className="p-2 text-black">
                        {(() => {
                          const name = s.label?.name;
                          return name
                            ? <span className="inline-block px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">{name}</span>
                            : '-';
                        })()}
                      </td>
                      <td className="p-2 text-black">{(() => {
                        const dateStr = s.status === 'TRIAL'
                          ? (s.trialEndsAt || s.expiresAt)
                          : (s.currentPeriodEnd || s.expiresAt);
                        return dateStr ? new Date(dateStr).toLocaleDateString() : '-';
                      })()}</td>
                      <td className="p-2">
                        {(() => {
                          const endStr = s.status === 'TRIAL' ? (s.trialEndsAt || s.expiresAt) : (s.currentPeriodEnd || s.expiresAt);
                          const expired = endStr ? new Date(endStr).getTime() < Date.now() : false;
                          const canRenew = s.plan === 'ENTERPRISE_CUSTOM' && expired;
                          if (!canRenew) return null;
                          return (
                            <button
                              onClick={() => { setRenewTarget(s as any); setRenewOpen(true); setRenewPrice(0); setRenewCurrency('IDR'); setRenewPeriod('MONTHLY'); setRenewInvoiceNumber(''); setRenewReferenceNumber(''); setRenewBankName(''); setRenewPaidBy(''); setRenewNotes(''); setRenewAwaitingApproval(true); }}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-900 text-white hover:bg-slate-800"
                            >
                              Renew
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Table pagination (duplicate controls at bottom for convenience) */}
          <div className="flex items-center justify-end gap-2 mt-3 text-sm text-black">
            <span>Page {subsCurrentPage} / {subsTotalPages}</span>
            <button onClick={()=> setSubsPage(p=> Math.max(1, p-1))} disabled={subsCurrentPage<=1} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button onClick={()=> setSubsPage(p=> Math.min(subsTotalPages, p+1))} disabled={subsCurrentPage>=subsTotalPages} className="px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>

        

        {/* Enterprise Labels table */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold flex items-center text-black"><FiTag className="mr-2" /> Enterprise Labels</h2>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
              <input value={labelsSearch} onChange={(e)=>{ setLabelsSearch(e.target.value); setLabelsPage(1);} } placeholder="Search name, code, description" className="border rounded px-3 py-1.5 text-xs md:text-sm text-black w-full sm:w-72" />
              <select value={String(labelsPageSize)} onChange={(e)=>{ setLabelsPageSize(parseInt(e.target.value)); setLabelsPage(1);} } className="border rounded px-2 py-1.5 text-xs md:text-sm text-black w-full sm:w-auto">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2 text-black">Name</th>
                  <th className="p-2 text-black">Code</th>
                  <th className="p-2 text-black">Description</th>
                  <th className="p-2 text-black">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedLabels.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-600">Tidak ada label</td></tr>
                ) : (
                  pagedLabels.map((label: any) => (
                    <tr key={label.id} className="border-t">
                      <td className="p-2 text-black">{label.name}</td>
                      <td className="p-2"><span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono">{label.code}</span></td>
                      <td className="p-2 text-black">{label.description || '-'}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 rounded border text-xs hover:bg-gray-50 text-green-700" onClick={()=>{ setLabelToEdit(label); setLabelEditForm({ name: label.name, description: label.description || '' }); setLabelEditOpen(true); }}>Edit</button>
                          <button className="px-2 py-1 rounded border text-xs hover:bg-red-50 text-red-700" onClick={()=> setLabelDeleteId(label.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 mt-3 text-xs md:text-sm text-black">
            <span>Page {labelsCurrentPage} / {labelsTotalPages}</span>
            <button onClick={()=> setLabelsPage(p=> Math.max(1, p-1))} disabled={labelsCurrentPage<=1} className="px-2 py-1 md:px-3 md:py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Prev</button>
            <button onClick={()=> setLabelsPage(p=> Math.min(labelsTotalPages, p+1))} disabled={labelsCurrentPage>=labelsTotalPages} className="px-2 py-1 md:px-3 md:py-1 rounded border hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>

        {/* Modals */}
        {showCreateLabelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateLabelModal(false)}>
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b text-black text-lg font-semibold">Create Enterprise Label</div>
              <div className="p-6 space-y-3">
                <input value={labelName} onChange={(e) => setLabelName(e.target.value)} className="border rounded px-3 py-2 w-full text-black" placeholder="Label name" />
                <textarea value={labelDescription} onChange={(e) => setLabelDescription(e.target.value)} className="border rounded px-3 py-2 w-full text-black" placeholder="Description (optional)" />
                {createdLabel && (
                  <div className="text-xs text-gray-600">Label created: <span className="font-semibold text-black">{createdLabel.name}</span> (ID: {createdLabel.id})</div>
                )}
              </div>
              <div className="px-6 pb-6 flex items-center justify-end space-x-3">
                <button onClick={() => setShowCreateLabelModal(false)} className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50">Batal</button>
                <button onClick={handleCreateLabel} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Create Label</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Enterprise Label modal */}
        {labelEditOpen && labelToEdit && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3" onClick={()=> setLabelEditOpen(false)}>
            <div className="bg-white rounded-xl w-full max-w-md shadow" onClick={(e)=> e.stopPropagation()}>
              <div className="px-4 py-3 border-b text-black font-semibold">Edit Enterprise Label</div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Name</label>
                  <input className="w-full border rounded px-3 py-2 text-sm text-black" value={labelEditForm.name || ''} onChange={(e)=> setLabelEditForm(p=> ({...p, name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Description</label>
                  <textarea className="w-full border rounded px-3 py-2 text-sm text-black" rows={3} value={labelEditForm.description || ''} onChange={(e)=> setLabelEditForm(p=> ({...p, description: e.target.value}))} />
                </div>
              </div>
              <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 rounded border text-sm text-red-600" onClick={()=> setLabelEditOpen(false)}>Cancel</button>
                <button className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm" onClick={async ()=> {
                  try {
                    await subscriptionService.updateEnterpriseLabel(labelToEdit.id, {
                      name: labelEditForm.name || undefined,
                      description: labelEditForm.description || undefined,
                    });
                    const labelsRes = await subscriptionService.getEnterpriseLabels();
                    setEnterpriseLabels(labelsRes || []);
                    setLabelEditOpen(false);
                    setLabelToEdit(null);
                    toast.success('Label berhasil diupdate');
                  } catch (e:any) {
                    toast.error(e?.response?.data?.message || 'Gagal update label');
                  }
                }}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm delete Enterprise Label */}
        {labelDeleteId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3" onClick={()=> setLabelDeleteId(null)}>
            <div className="bg-white rounded-xl w-full max-w-sm shadow" onClick={(e)=> e.stopPropagation()}>
              <div className="px-4 py-3 border-b text-black font-semibold">Delete Label</div>
              <div className="p-4 text-sm text-black">Yakin ingin menghapus enterprise label ini?</div>
              <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 rounded border text-sm" onClick={()=> setLabelDeleteId(null)}>Cancel</button>
                <button className="px-3 py-1.5 rounded bg-red-600 text-white text-sm" onClick={async ()=> {
                  try {
                    await subscriptionService.deleteEnterpriseLabel(labelDeleteId!);
                    const labelsRes = await subscriptionService.getEnterpriseLabels();
                    setEnterpriseLabels(labelsRes || []);
                    setLabelDeleteId(null);
                    toast.success('Label berhasil dihapus');
                  } catch (e:any) {
                    toast.error(e?.response?.data?.message || 'Gagal menghapus label');
                  }
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {renewOpen && renewTarget && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" onClick={() => setRenewOpen(false)}>
            <div className="bg-white rounded-xl max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b text-black text-lg font-semibold">Renew Enterprise Custom</div>
              <div className="p-6 space-y-3">
                <div className="text-sm text-gray-700">
                  Dapur:{' '}
                  <span className="font-medium text-black">
                    {renewTarget.dapurUnit?.name || renewTarget.dapurUnitId}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Currency</label>
                    <select value={renewCurrency} onChange={(e)=>setRenewCurrency(e.target.value as any)} className="w-full border rounded px-2 py-1.5 text-sm text-black">
                      <option value="IDR">IDR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Period</label>
                    <select value={renewPeriod} onChange={(e)=>setRenewPeriod(e.target.value as any)} className="w-full border rounded px-2 py-1.5 text-sm text-black">
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="inline-flex items-center gap-2 text-sm text-black">
                      <input type="checkbox" checked={renewAwaitingApproval} onChange={(e)=>setRenewAwaitingApproval(e.target.checked)} />
                      <span>Tunda aktivasi hingga pembayaran</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Invoice Number</label>
                    <input value={renewInvoiceNumber} onChange={(e)=>setRenewInvoiceNumber(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-black" placeholder="INV-XXXX"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Reference Number</label>
                    <input value={renewReferenceNumber} onChange={(e)=>setRenewReferenceNumber(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-black" placeholder="Ref / Transfer ID"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Bank Name</label>
                    <input value={renewBankName} onChange={(e)=>setRenewBankName(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-black" placeholder="Bank"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Paid By</label>
                    <input value={renewPaidBy} onChange={(e)=>setRenewPaidBy(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-black" placeholder="PIC / Company"/>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Notes</label>
                    <textarea value={renewNotes} onChange={(e)=>setRenewNotes(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm text-black h-20" placeholder="Catatan internal (opsional)" />
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 flex items-center justify-end gap-2">
                <button onClick={() => setRenewOpen(false)} className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50">Batal</button>
                <button onClick={handleRenewSubmit} className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800">Buat Invoice Renewal</button>
              </div>
            </div>
          </div>
        )}

        {/* removed Bulk Create Investors modal */}
      </div>
    </RoleGuard>
  );
}