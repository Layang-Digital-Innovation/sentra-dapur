"use client";

import React, { useEffect, useState } from "react";
import { FiShoppingBag, FiCheckCircle, FiXCircle, FiClock, FiEye, FiSearch, FiCalendar, FiSave, FiSend, FiFileText, FiMessageCircle, FiImage, FiPlus, FiTrash2 } from "react-icons/fi";
import { dapurService } from "@/services/dapur.service";
import { userService } from "@/services/user.service";
import { tradingService } from "@/services/trading.service";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

export default function AdminDapurPOPage() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalType, setModalType] = useState<"VIEW" | "CREATE" | null>(null);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dapur, setDapur] = useState<any | null>(null);

  const [newPOItems, setNewPOItems] = useState<any[]>([
    { productName: "", quantity: 0, unit: "", supplierName: "", pricePerUnit: 0 }
  ]);
  const [warehouseType, setWarehouseType] = useState<'GUDANG_BAHAN' | 'GUDANG_LAIN'>('GUDANG_BAHAN');

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const data = await dapurService.getPurchaseOrders();
      setPos(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat Purchase Orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
    userService.getAllUsers({ role: "SUPPLIER" as any }).then(res => setSuppliers(res.users || [])).catch(console.error);
    tradingService.getApprovedProducts().then(res => setProducts(res || [])).catch(console.error);
    dapurService.getMyDapur().then(res => {
      if (res && res.length > 0) setDapur(res[0]);
    }).catch(console.error);
  }, []);

  const openView = (po: any) => {
    setSelectedPO(po);
    setEditableItems((po.items || []).map((i: any) => ({ ...i })));
    setModalType("VIEW");
  };

  const openCreate = () => {
    setNewPOItems([{ productName: "", quantity: 1, unit: "", supplierName: "", pricePerUnit: 0 }]);
    setWarehouseType('GUDANG_BAHAN');
    setModalType("CREATE");
  };

  const closeModal = () => {
    setSelectedPO(null);
    setEditableItems([]);
    setModalType(null);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setEditableItems(prev => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: value };
      
      if (field === "supplierName") {
         const selectedSupplier = suppliers.find((s: any) => (s.fullname || s.fullName) === value || s.email === value);
         if (selectedSupplier) {
           const supplierProducts = products.filter((p: any) => p.sellerId === selectedSupplier.id);
           const pName = (arr[index].productName || "").toLowerCase();
           const matchingProduct = supplierProducts.find((p: any) => (p.name || "").toLowerCase().includes(pName) || pName.includes((p.name || "").toLowerCase()));
           if (matchingProduct) {
             const idrPrice = (matchingProduct as any).prices?.find((pr: any) => pr.currency === "IDR")?.price || (matchingProduct as any).price || 0;
             arr[index].pricePerUnit = idrPrice;
           } else {
             arr[index].pricePerUnit = 0;
           }
         } else {
           arr[index].pricePerUnit = 0;
         }
      }
      return arr;
    });
  };

  const handleSaveItems = async () => {
    if (!selectedPO) return;
    setActionLoading(true);
    try {
      await dapurService.updatePurchaseOrder(selectedPO.id, editableItems.map(i => ({
        ...i,
        quantity: typeof i.quantity === 'string' ? parseInt(i.quantity) || 0 : i.quantity,
        pricePerUnit: typeof i.pricePerUnit === 'string' ? parseFloat(i.pricePerUnit) || 0 : i.pricePerUnit,
        unit: i.unit
      })));
      await fetchPOs();
      alert("Perubahan detail PO berhasil disimpan.");
      setSelectedPO({ ...selectedPO, items: editableItems });
    } catch (err: any) {
      alert("Gagal menyimpan perubahan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePO = async (poId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus Purchase Order ini? Data yang terhapus tidak dapat dikembalikan.")) return;
    try {
      await dapurService.deletePurchaseOrder(poId);
      alert("Purchase Order berhasil dihapus.");
      await fetchPOs();
      if (selectedPO && selectedPO.id === poId) {
        closeModal();
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghapus Purchase Order");
    }
  };

  const handleCreateManualPO = async () => {
    if (!dapur) {
      alert("Gagal mendeteksi Dapur Unit. Pastikan anda Admin Dapur yang sah.");
      return;
    }

    // Validation
    for (const item of newPOItems) {
      if (!item.productName.trim()) {
        alert("Peringatan: Nama item tidak boleh kosong!");
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        alert("Peringatan: Kuantitas harus lebih dari 0!");
        return;
      }
      if (!item.unit.trim()) {
        alert("Peringatan: Satuan harus diisi!");
        return;
      }
    }

    const gudangLabel = warehouseType === 'GUDANG_BAHAN' ? 'Gudang Bahan Baku' : 'Gudang Lain-lain';
    if (!confirm(`Buat Purchase Order manual untuk ${gudangLabel} dengan ${newPOItems.length} item?`)) return;

    setActionLoading(true);
    try {
      await dapurService.createPO(dapur.id, newPOItems, warehouseType);
      alert(`PO Manual (${gudangLabel}) berhasil diajukan untuk disetujui Admin Pusat.`);
      await fetchPOs();
      closeModal();
    } catch (err: any) {
      alert("Gagal membuat PO manual: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const addNewPOItem = () => {
    setNewPOItems(prev => [...prev, { productName: "", quantity: 1, unit: "", supplierName: "", pricePerUnit: 0 }]);
  };

  const removePOItem = (idx: number) => {
    if (newPOItems.length <= 1) return;
    setNewPOItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleNewItemChange = (index: number, field: string, value: any) => {
    setNewPOItems(prev => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: value };
      
      if (field === "supplierName") {
         const selectedSupplier = suppliers.find((s: any) => (s.fullname || s.fullName) === value || s.email === value);
         if (selectedSupplier) {
           const supplierProducts = products.filter((p: any) => p.sellerId === selectedSupplier.id);
           const pName = (arr[index].productName || "").toLowerCase();
           const matchingProduct = supplierProducts.find((p: any) => (p.name || "").toLowerCase().includes(pName) || pName.includes((p.name || "").toLowerCase()));
           if (matchingProduct) {
             const idrPrice = (matchingProduct as any).prices?.find((pr: any) => pr.currency === "IDR")?.price || (matchingProduct as any).price || 0;
             arr[index].pricePerUnit = idrPrice;
           } else {
             arr[index].pricePerUnit = 0;
           }
         } else {
           arr[index].pricePerUnit = 0;
         }
      }
      return arr;
    });
  };

  const handleSendToSupplier = async (supplierName: string) => {
    if (!selectedPO) return;
    if (!confirm(`Tandai PO untuk supplier "${supplierName}" sebagai terkirim/dipesan?`)) return;
    setActionLoading(true);
    try {
      await dapurService.sendPOToSupplier(selectedPO.id, supplierName);
      await fetchPOs();
      setEditableItems(prev => prev.map(item => 
        item.supplierName === supplierName ? { ...item, isOrdered: true } : item
      ));
      alert(`PO untuk ${supplierName} berhasil ditandai sebagai DIPESAN.`);
    } catch (err: any) {
      alert("Gagal mengirim PO: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const generateGroupPDF = (supplierName: string, items: any[]) => {
    const doc = new jsPDF();
    const poId = selectedPO.id.substring(0, 8).toUpperCase();
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const dapurUnit = selectedPO.dapurUnit;
    
    const pageWidth = doc.internal.pageSize.getWidth();
    if (dapurUnit?.logoUrl) {
      try {
        doc.addImage(dapurUnit.logoUrl, 'PNG', 14, 8, 22, 22);
      } catch (e) {}
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(dapurUnit?.name?.toUpperCase() || "SENTRA DAPUR", pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(dapurUnit?.foundationName?.toUpperCase() || "", pageWidth / 2, 21, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const address = dapurUnit?.fullAddress || "Sistem Manajemen Cloud Kitchen Terpadu";
    const splitAddress = doc.splitTextToSize(address, 160);
    doc.text(splitAddress, pageWidth / 2, 27, { align: "center" });
    
    // Double lines
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(14, 36, 196, 36);
    doc.setLineWidth(0.2);
    doc.line(14, 37.5, 196, 37.5);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`PURCHASE ORDER #${poId}`, 14, 50);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal: ${dateStr}`, 14, 58);
    doc.text(`Supplier: ${supplierName}`, 14, 64);
    
    const tableData = items.map((item, idx) => [
      idx + 1,
      item.productName,
      `${item.quantity.toLocaleString('id-ID')} ${item.unit || 'Gram'}`,
      `Rp ${(item.pricePerUnit || 0).toLocaleString('id-ID')}`,
      `Rp ${(item.quantity * (item.pricePerUnit || 0)).toLocaleString('id-ID')}`
    ]);
    
    const total = items.reduce((sum, item) => sum + (item.quantity * (item.pricePerUnit || 0)), 0);
    
    autoTable(doc, {
      startY: 75,
      head: [['No', 'Bahan Baku', 'Kuantitas', 'Harga Satuan', 'Subtotal']],
      body: tableData,
      foot: [['', '', '', 'TOTAL PESANAN', `Rp ${total.toLocaleString('id-ID')}`]],
      theme: 'grid',
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
      footStyles: { fillColor: [249, 250, 251], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY < 230) {
      // Date & Location
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`Cibalong, ${dateStr}`, 155, finalY - 5, { align: "center" });

      // Signature Akuntan (Left)
      doc.text("Dibuat,", 40, finalY, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text("Akuntan", 40, finalY + 5, { align: "center" });
      
      if (dapurUnit?.signatureUrl) {
        try {
          doc.addImage(dapurUnit.signatureUrl, 'PNG', 20, finalY + 8, 40, 18);
        } catch (e) {}
      }
      
      doc.setFont("helvetica", "normal");
      doc.text(dapurUnit?.adminDapurName || "", 40, finalY + 32, { align: "center" });

      // Signature Kepala Satuan (Right)
      doc.setFont("helvetica", "normal");
      doc.text("Disetujui,", 155, finalY, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text("Kepala Satuan Pelayanan Pemenuhan", 155, finalY + 5, { align: "center" });
      doc.text("Gizi", 155, finalY + 10, { align: "center" });

      if (dapurUnit?.kepalaSatuanSignatureUrl) {
        try {
          doc.addImage(dapurUnit.kepalaSatuanSignatureUrl, 'PNG', 135, finalY + 13, 40, 18);
        } catch (e) {}
      }

      doc.setFont("helvetica", "normal");
      doc.text(dapurUnit?.kepalaSatuanName || "", 155, finalY + 38, { align: "center" });
    }
    
    doc.save(`PO_SD_${poId}_${supplierName.replace(/\s+/g, '_')}.pdf`);
  };

  const generateGroupJPG = async (supplierName: string, items: any[]) => {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "800px";
    container.style.padding = "40px";
    container.style.backgroundColor = "white";
    container.style.fontFamily = "sans-serif";
    
    const poId = selectedPO.id.substring(0, 8).toUpperCase();
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const total = items.reduce((sum, item) => sum + (item.quantity * (item.pricePerUnit || 0)), 0);
    const dapurUnit = selectedPO.dapurUnit;
    
    const logoHtml = dapurUnit?.logoUrl ? `<img src="${dapurUnit.logoUrl}" style="height: 60px; width: auto; object-fit: contain;" />` : '';
    const sigAkuntanHtml = dapurUnit?.signatureUrl ? `<img src="${dapurUnit.signatureUrl}" style="height: 60px; width: auto; margin: 0 auto;" />` : '<div style="height: 60px;"></div>';
    const sigKepalaHtml = dapurUnit?.kepalaSatuanSignatureUrl ? `<img src="${dapurUnit.kepalaSatuanSignatureUrl}" style="height: 60px; width: auto; margin: 0 auto;" />` : '<div style="height: 60px;"></div>';
    
    let itemsHtml = "";
    items.forEach((item, idx) => {
      itemsHtml += `<tr>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">${item.productName}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${item.quantity.toLocaleString('id-ID')} ${item.unit || 'Gram'}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Rp ${(item.pricePerUnit || 0).toLocaleString('id-ID')}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">Rp ${(item.quantity * (item.pricePerUnit || 0)).toLocaleString('id-ID')}</td>
      </tr>`;
    });

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px; position: relative; min-height: 80px;">
        <div style="position: absolute; left: 0;">
          ${logoHtml}
        </div>
        <div style="text-align: center;">
          <div style="color: #000; font-size: 24px; font-weight: 800; line-height: 1.1;">${(dapurUnit?.name || 'SENTRA DAPUR').toUpperCase()}</div>
          <div style="color: #000; font-size: 18px; font-weight: 700; margin-top: 4px;">${(dapurUnit?.foundationName || '').toUpperCase()}</div>
          <div style="color: #4b5563; font-size: 11px; max-width: 600px; margin-top: 6px; line-height: 1.4;">${dapurUnit?.fullAddress || 'Jl. Cilimbangan No 2 Cililitan, Desa Cibalong Kecamatan Cibalong Kabupaten Tasikmalaya, Provinsi Jawa Barat'}</div>
        </div>
      </div>
      <div style="border-bottom: 3px solid #000; margin-bottom: 2px;"></div>
      <div style="border-bottom: 1px solid #000; margin-bottom: 24px;"></div>
      
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">PURCHASE ORDER #${poId}</div>
      <div style="font-size: 14px; margin-bottom: 4px;">Tanggal: ${dateStr}</div>
      <div style="font-size: 14px; margin-bottom: 24px;">Supplier: ${supplierName}</div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #1f2937; color: white;">
            <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">No</th>
            <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Bahan Baku</th>
            <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">Kuantitas</th>
            <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">Harga</th>
            <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot style="background-color: #f9fafb; font-weight: bold;">
          <tr>
            <td colspan="4" style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">TOTAL PESANAN</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: #000; font-size: 16px;">Rp ${total.toLocaleString('id-ID')}</td>
          </tr>
        </tfoot>
      </table>

      <div style="display: flex; flex-direction: column; margin-top: 50px; background-color: #fff; padding: 20px; border-radius: 8px;">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
           <div style="font-size: 11px; color: #000;">Cibalong, ${dateStr}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
          <div style="text-align: center;">
            <div style="font-size: 11px; color: #000; line-height: 1.2;">Dibuat,</div>
            <div style="font-size: 11px; font-weight: bold; color: #000; margin-bottom: 30px;">Akuntan</div>
            ${sigAkuntanHtml}
            <div style="font-size: 11px; color: #000; margin-top: 4px;">${dapurUnit?.adminDapurName || ''}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 11px; color: #000; line-height: 1.2;">Disetujui,</div>
            <div style="font-size: 11px; font-weight: bold; color: #000; margin-bottom: 30px;">Kepala Satuan Pelayanan Pemenuhan<br/>Gizi</div>
            ${sigKepalaHtml}
            <div style="font-size: 11px; color: #000; margin-top: 4px;">${dapurUnit?.kepalaSatuanName || ''}</div>
          </div>
        </div>
      </div>
      <div style="margin-top: 40px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px dashed #e5e7eb; padding-top: 10px;">Generated by Sentra Dapur Platform</div>`;
    
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement("a");
      link.download = `PO_SD_${poId}_${supplierName.replace(/\s+/g, '_')}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal generate JPG:", err);
      alert("Gagal me-render gambar PO.");
    } finally {
      document.body.removeChild(container);
    }
  };

  const openWhatsApp = (supplierName: string, items: any[]) => {
    const supplier = suppliers.find(s => (s.fullname || s.fullName) === supplierName || s.email === supplierName);
    let phone = supplier?.whatsapp || supplier?.phone || "";
    if (phone && phone.startsWith('0')) phone = '62' + phone.substring(1);
    
    const poId = selectedPO.id.substring(0, 8).toUpperCase();
    const itemsList = items.map(i => `- ${i.productName}: ${i.quantity} ${i.unit || 'Gram'}`).join('%0A');
    const total = items.reduce((sum, item) => sum + (item.quantity * (item.pricePerUnit || 0)), 0);
    
    const message = `Halo ${supplierName},%0A%0AIni adalah Purchase Order (PO) dari Sentra Dapur Kitchen (#${poId}).%0A%0ADaftar Pesanan:%0A${itemsList}%0A%0AEstimasi Total: Rp ${total.toLocaleString('id-ID')}%0A%0AMohon konfirmasi kesediaan stok dan harga. File detail PO dalam format PDF akan kami lampirkan. Terima kasih!`;
    
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded flex items-center gap-1 w-max"><FiClock/> PENDING</span>;
      case "APPROVED":
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded flex items-center gap-1 w-max"><FiCheckCircle/> APPROVED</span>;
      case "ORDERED":
        return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded flex items-center gap-1 w-max"><FiShoppingBag/> ORDERED</span>;
      case "REJECTED":
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded flex items-center gap-1 w-max"><FiXCircle/> REJECTED</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded flex items-center gap-1 w-max">{status}</span>;
    }
  };

  const calculateTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.pricePerUnit) || 0)), 0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start justify-between sm:flex-row sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             <FiShoppingBag className="text-amber-600" /> Status Purchase Order
           </h1>
           <p className="text-gray-500 text-sm mt-1">Pantau status pengajuan PO dan edit detail sebelum disetujui Admin Pusat.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchPOs} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors shadow-sm">
            Refresh Data
          </button>
          <button onClick={openCreate} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-sm transition-all shadow-md flex items-center gap-2">
            <FiPlus /> BUAT PO MANUAL
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      ) : pos.length === 0 ? (
        <div className="p-12 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4"><FiShoppingBag className="w-8 h-8"/></div>
            <h3 className="text-lg font-bold text-gray-900">Belum ada Purchase Order</h3>
            <p className="text-gray-500 max-w-sm mt-1">Request PO yang Anda buat melalui halaman kalkulasi akan muncul di sini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                 <tr>
                    <th className="p-4">Tanggal (ID)</th>
                    <th className="p-4">Dapur Unit</th>
                    <th className="p-4">Jenis Gudang</th>
                    <th className="p-4">Item (SKU)</th>
                    <th className="p-4">Estimasi Total</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 text-sm">
                  {pos.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-gray-800 block">{(new Date(po.createdAt)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="text-xs text-gray-400">{po.id.substring(0, 8).toUpperCase()}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-gray-800">{po.dapurUnit?.name || 'Unknown Dapur'}</span>
                        {po.createdBy && <span className="block text-xs text-gray-500">By: {po.createdBy.fullname || po.createdBy.email}</span>}
                      </td>
                      <td className="p-4">
                        {po.type === 'GUDANG_BAHAN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">🥬 Bahan Baku</span>
                        ) : po.type === 'GUDANG_LAIN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">📦 Lain-lain</span>
                        ) : po.type === 'MANUAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">✏️ Manual</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 border border-gray-200 text-xs rounded-full">{po.type || '-'}</span>
                        )}
                      </td>
                      <td className="p-4">
                         <span className="font-medium text-slate-700">{po.items?.length || 0} Jenis Item</span>
                      </td>
                      <td className="p-4 font-bold text-emerald-600">
                         Rp {calculateTotal(po.items || []).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4">
                         {getStatusBadge(po.status)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2 items-center">
                           <button 
                              onClick={() => openView(po)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                           >
                             <FiEye /> Detail {po.status === "PENDING" && "& Edit"}
                           </button>
                           <button 
                              onClick={() => handleDeletePO(po.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
                              title="Hapus PO"
                           >
                             <FiTrash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {modalType === "VIEW" && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
             
             <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                <div>
                   <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                     Detail Purchase Order <span className="text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">#{selectedPO.id.substring(0, 8).toUpperCase()}</span>
                   </h2>
                   <p className="text-sm text-gray-500 mt-0.5">{selectedPO.dapurUnit?.name} • {(new Date(selectedPO.createdAt)).toLocaleDateString('id-ID')}</p>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                  <FiXCircle className="w-6 h-6" />
                </button>
             </div>

             <div className="p-6 overflow-y-auto flex-1 bg-white">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-gray-800">Daftar Permintaan Bahan Baku</h3>
                   {getStatusBadge(selectedPO.status)}
                </div>
                
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-gray-200">
                        <tr>
                           <th className="px-4 py-3 font-semibold text-gray-600">No</th>
                           <th className="px-4 py-3 font-semibold text-gray-600">Nama Item</th>
                           <th className="px-4 py-3 font-semibold text-gray-600">Supplier Tujuan</th>
                           <th className="px-4 py-3 text-right font-semibold text-gray-600">Terhitung (Kuantitas & Satuan)</th>
                           <th className="px-4 py-3 text-right font-semibold text-gray-600">Harga Satuan</th>
                           <th className="px-4 py-3 text-right font-semibold text-gray-600">Total Biaya</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {editableItems.map((item: any, idx: number) => {
                           const isPending = selectedPO.status === "PENDING";
                           return (
                           <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-gray-400 font-medium">{idx + 1}</td>
                              <td className="px-4 py-3">
                                {isPending ? (
                                   <input className="font-bold text-gray-800 bg-white border border-gray-300 rounded px-2 py-1.5 w-full text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={item.productName} onChange={(e) => handleItemChange(idx, "productName", e.target.value)} />
                                ) : (
                                   <span className="font-bold text-gray-800 block">{item.productName}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {isPending ? (
                                   <select className="bg-white border border-gray-300 text-sm rounded-md px-2 py-1.5 w-full focus:ring-2 focus:ring-amber-500 outline-none" value={item.supplierName || ""} onChange={(e) => handleItemChange(idx, "supplierName", e.target.value)}>
                                     <option value="">-- Pilih Supplier --</option>
                                     {suppliers.map((s: any) => <option key={s.id} value={s.fullname || s.email}>{s.fullname || s.email}</option>)}
                                   </select>
                                ) : (
                                   item.supplierName || <span className="text-gray-400 italic">Belum Ditentukan</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-700 w-52">
                                {isPending ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <input type="number" className="text-right font-bold text-gray-700 bg-white border border-gray-300 rounded px-2 py-1.5 w-24 text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={item.quantity} onChange={(e) => handleItemChange(idx, "quantity", e.target.value)} />
                                    <input type="text" placeholder="Satuan" className="bg-white border border-gray-300 rounded px-2 py-1.5 w-20 text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={item.unit || ""} onChange={(e) => handleItemChange(idx, "unit", e.target.value)} />
                                  </div>
                                ) : (
                                  `${item.quantity.toLocaleString('id-ID')} ${item.unit || 'Gram'}`
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600 w-36">
                                {isPending ? (
                                  <input type="number" className="text-right text-gray-600 bg-white border border-gray-300 rounded px-2 py-1.5 w-full text-sm focus:ring-2 focus:ring-amber-500 outline-none" value={item.pricePerUnit || ""} onChange={(e) => handleItemChange(idx, "pricePerUnit", e.target.value)} />
                                ) : (
                                  `Rp ${(item.pricePerUnit || 0).toLocaleString('id-ID')}`
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                 Rp {((parseInt(item.quantity) || 0) * (parseFloat(item.pricePerUnit) || 0)).toLocaleString('id-ID')}
                                 {item.isOrdered && (
                                   <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-bold uppercase">
                                     <FiCheckCircle /> Sent
                                   </div>
                                 )}
                              </td>
                           </tr>);
                        })}
                     </tbody>
                     <tfoot className="bg-slate-900 text-white">
                        <tr>
                           <td colSpan={5} className="px-4 py-4 text-right font-bold tracking-widest text-xs uppercase">TOTAL ESTIMASI KESELURUHAN</td>
                           <td className="px-4 py-4 text-right font-black text-amber-400 text-lg">Rp {calculateTotal(editableItems).toLocaleString('id-ID')}</td>
                        </tr>
                     </tfoot>
                   </table>
                </div>

                {(selectedPO.status === "APPROVED" || selectedPO.status === "ORDERED") && (
                   <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                     <h3 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wider flex items-center gap-2">
                        <FiSend className="text-amber-600" /> Kirim PO ke Supplier (Grup per Supplier)
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {Object.entries(
                         editableItems.reduce((acc, item) => {
                           const key = item.supplierName || "TANPA SUPPLIER";
                           if (!acc[key]) acc[key] = [];
                           acc[key].push(item);
                           return acc;
                         }, {} as Record<string, any[]>)
                       ).map(([sName, items]: [string, any]) => {
                         const allSent = (items as any[]).every((i: any) => i.isOrdered);
                         const totalGroup = (items as any[]).reduce((sum: number, i: any) => sum + (parseFloat(i.quantity) * parseFloat(i.pricePerUnit || 0)), 0);
                         return (
                           <div key={sName} className={`p-4 rounded-xl border-2 transition-all ${allSent ? 'bg-emerald-50 border-emerald-100 shadow-sm' : 'bg-white border-gray-100 hover:border-amber-200'} flex items-center justify-between`}>
                             <div>
                               <span className="block font-bold text-gray-900">{sName}</span>
                               <span className="text-xs text-gray-500 font-medium">{(items as any[]).length} Item • <span className="text-amber-600">Rp {totalGroup.toLocaleString('id-ID')}</span></span>
                             </div>
                             {allSent ? (
                               <div className="flex flex-col items-end gap-2">
                                 <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-[11px] uppercase tracking-wider">
                                    <FiCheckCircle /> TERKIRIM
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <button onClick={() => generateGroupPDF(sName, items)} className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-gray-200" title="Download PDF">
                                     <FiFileText className="w-4 h-4" />
                                   </button>
                                   <button onClick={() => generateGroupJPG(sName, items)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200" title="Download JPG">
                                     <FiImage className="w-4 h-4" />
                                   </button>
                                   <button onClick={() => openWhatsApp(sName, items)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-200" title="Send WhatsApp">
                                     <FiMessageCircle className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>
                             ) : (
                               <div className="flex items-center gap-2">
                                 <div className="flex items-center gap-1.5 mr-2">
                                   <button onClick={() => generateGroupPDF(sName, items)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-gray-200" title="Pratinjau PDF">
                                     <FiFileText className="w-4 h-4" />
                                   </button>
                                   <button onClick={() => generateGroupJPG(sName, items)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200" title="Pratinjau JPG">
                                     <FiImage className="w-4 h-4" />
                                   </button>
                                 </div>
                                 <button onClick={() => handleSendToSupplier(sName)} disabled={actionLoading || sName === "TANPA SUPPLIER"} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow hover:shadow-lg disabled:opacity-50 flex items-center gap-2">
                                   <FiSend /> KIRIM PO
                                 </button>
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 )}

                 {selectedPO.approvedBy && selectedPO.status !== "PENDING" && (
                   <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Diproses Oleh:</span>
                      <span className="text-sm font-bold text-gray-800">{selectedPO.approvedBy.fullname || selectedPO.approvedBy.email}</span>
                   </div>
                 )}
             </div>

             <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                  <button onClick={closeModal} disabled={actionLoading} className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Tutup</button>
                  {selectedPO.status === "PENDING" && (
                    <button onClick={handleSaveItems} disabled={actionLoading} className="px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 shadow-sm focus:ring-4 focus:ring-amber-200 transition-all disabled:opacity-50 flex items-center gap-2">
                      <FiSave /> SIMPAN PERUBAHAN
                    </button>
                  )}
             </div>
           </div>
        </div>
      )}

      {/* Modal Create PO Manual */}
      {modalType === "CREATE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="px-8 py-5 border-b border-gray-100 flex items-start justify-between bg-white">
                 <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <FiPlus className="text-amber-600" /> Buat Purchase Order Manual
                    </h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">Pengajuan PO untuk bahan baku gudang atau kebutuhan lain-lain.</p>
                    {/* Warehouse Type Selector */}
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">Tujuan Gudang:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setWarehouseType('GUDANG_BAHAN')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                            warehouseType === 'GUDANG_BAHAN'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600'
                          }`}
                        >
                          <span>🥬</span> Gudang Bahan Baku
                        </button>
                        <button
                          type="button"
                          onClick={() => setWarehouseType('GUDANG_LAIN')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                            warehouseType === 'GUDANG_LAIN'
                              ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
                          }`}
                        >
                          <span>📦</span> Gudang Lain-lain
                        </button>
                      </div>
                    </div>
                 </div>
                 <button onClick={closeModal} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors ml-4">
                   <FiXCircle className="w-8 h-8" />
                 </button>
              </div>

             <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
                <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-widest">
                       <tr>
                          <th className="px-6 py-4 font-bold">No</th>
                          <th className="px-6 py-4 font-bold">Nama Item Baru / Non-Baku</th>
                          <th className="px-6 py-4 font-bold">Supplier Tujuan</th>
                          <th className="px-6 py-4 font-bold text-right">Kuantitas</th>
                          <th className="px-6 py-4 font-bold">Satuan</th>
                          <th className="px-6 py-4 font-bold text-right">Harga Satuan (Rp)</th>
                          <th className="px-6 py-4 font-bold text-right">Aksi</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {newPOItems.map((item, idx) => (
                         <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-6 py-4">
                               <input 
                                 placeholder="Contoh: Gas Elpiji 12kg"
                                 className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none" 
                                 value={item.productName} 
                                 onChange={(e) => handleNewItemChange(idx, "productName", e.target.value)} 
                               />
                            </td>
                            <td className="px-6 py-4">
                               <select 
                                 className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none w-[180px]" 
                                 value={item.supplierName || ""} 
                                 onChange={(e) => handleNewItemChange(idx, "supplierName", e.target.value)}
                               >
                                 <option value="">-- Pilih --</option>
                                 {suppliers.map((s: any) => <option key={s.id} value={s.fullname || s.email}>{s.fullname || s.email}</option>)}
                               </select>
                            </td>
                            <td className="px-6 py-4 w-28">
                               <input 
                                 type="number" 
                                 className="w-full text-right bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none" 
                                 value={item.quantity} 
                                 onChange={(e) => handleNewItemChange(idx, "quantity", parseFloat(e.target.value) || 0)} 
                               />
                            </td>
                            <td className="px-6 py-4 w-24">
                               <input 
                                 placeholder="Unit"
                                 className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" 
                                 value={item.unit} 
                                 onChange={(e) => handleNewItemChange(idx, "unit", e.target.value)} 
                               />
                            </td>
                            <td className="px-6 py-4 w-36">
                               <input 
                                 type="number" 
                                 className="w-full text-right bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-amber-500 outline-none" 
                                 value={item.pricePerUnit} 
                                 onChange={(e) => handleNewItemChange(idx, "pricePerUnit", parseFloat(e.target.value) || 0)} 
                               />
                            </td>
                            <td className="px-6 py-4 text-center">
                               <button 
                                 onClick={() => removePOItem(idx)}
                                 className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-gray-100"
                               >
                                  <FiXCircle className="w-4 h-4" />
                               </button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                    <tfoot className="bg-white border-t-2 border-slate-900 font-black">
                       <tr className="text-sm">
                          <td colSpan={5} className="px-6 py-4 text-right uppercase tracking-[0.2em] text-slate-400">Total Estimasi Internal</td>
                          <td className="px-6 py-4 text-right text-lg text-emerald-600">
                             Rp {newPOItems.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0).toLocaleString('id-ID')}
                          </td>
                          <td></td>
                       </tr>
                    </tfoot>
                  </table>
                </div>
                
                <button 
                  onClick={addNewPOItem}
                  className="mt-4 flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-slate-300 text-slate-500 rounded-2xl w-full justify-center hover:bg-slate-50 hover:border-amber-500 transition-all font-bold text-xs uppercase tracking-widest"
                >
                   <FiPlus className="w-5 h-5 text-amber-500" /> Tambah Baris Pesanan
                </button>
             </div>

             <div className="px-8 py-5 border-t border-gray-100 bg-white flex items-center justify-end gap-3">
                  <button onClick={closeModal} disabled={actionLoading} className="px-6 py-3 bg-slate-50 text-slate-500 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors">Batalkan</button>
                  <button 
                    onClick={handleCreateManualPO} 
                    disabled={actionLoading} 
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <FiSave />}
                    KIRIM PERMINTAAN PO
                  </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
