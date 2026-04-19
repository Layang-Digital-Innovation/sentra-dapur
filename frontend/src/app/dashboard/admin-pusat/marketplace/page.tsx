"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  FiPackage, FiSearch, FiImage, FiPlus, FiX, FiCheck,
  FiUsers, FiEdit2, FiRefreshCw, FiMail, FiLock, FiUser,
  FiUpload, FiDownload, FiTrash2
} from "react-icons/fi";
import * as XLSX from "xlsx";
import { tradingService } from "@/services/trading.service";
import { userService } from "@/services/user.service";
import { Role, User } from "@/types/user.types";
import BomConversionSection from "@/components/BomConversionSection";

interface Product {
  id: string;
  name: string;
  description: string;
  price?: number;
  currency?: string;
  prices?: Array<{ currency: string; price: number }>;
  unit: string;
  weight: number;
  volume: string;
  seller?: { id?: string; fullname: string; email: string; companyName?: string };
  images?: Array<{ url: string; isCover: boolean }>;
  bomConversions?: Array<{ id: string; productionUnit: string; conversionFactor: number }>;
}

type ViewMode = "catalog" | "suppliers";

export default function AdminPusatMarketplacePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("catalog");

  // === Catalog state ===
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");

  // === Supplier list state ===
  const [suppliers, setSuppliers] = useState<User[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");

  // === Modal state (create / edit supplier) ===
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", whatsapp: "", noRekening: "", namaRekening: "" });
  const [submitting, setSubmitting] = useState(false);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // === Modal state (create / edit product) ===
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [targetSeller, setTargetSeller] = useState<User | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", unit: "kg", weight: "1", volume: "0.01" });

  // === BOM Conversions state ===
  const [bomConversions, setBomConversions] = useState<Array<{ productionUnit: string; conversionFactor: string }>>([]);
  const [bomErrors, setBomErrors] = useState<Array<{ productionUnit?: string; conversionFactor?: string }>>([]);

  // === Fetch products ===
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await tradingService.getApprovedProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // === Fetch suppliers ===
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const res = await userService.getAllUsers({ role: Role.SUPPLIER as any, search: supplierSearch });
      setSuppliers(res.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [supplierSearch]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // === Catalog helpers ===
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    (p.seller?.fullname && p.seller.fullname.toLowerCase().includes(search.toLowerCase()))
  );

  const getPrice = (product: Product) => {
    const idrPrice = product.prices?.find(p => p.currency === "IDR");
    if (idrPrice) return `Rp ${idrPrice.price.toLocaleString("id-ID")}`;
    if (product.price) return `Rp ${product.price.toLocaleString("id-ID")}`;
    return "Harga Disesuaikan";
  };

  const getCoverImage = (product: Product) => {
    if (!product.images || product.images.length === 0) return null;
    const cover = product.images.find(img => img.isCover);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:3001";
    if (cover && cover.url) return cover.url.startsWith("http") ? cover.url : `${backendUrl}${cover.url}`;
    const firstImg = product.images[0];
    if (firstImg && firstImg.url) return firstImg.url.startsWith("http") ? firstImg.url : `${backendUrl}${firstImg.url}`;
    return null;
  };

  // === Modal open/close ===
  const openCreate = () => {
    setEditTarget(null);
    setForm({ fullName: "", email: "", password: "", whatsapp: "", noRekening: "", namaRekening: "" });
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditTarget(u);
    setForm({ fullName: u.fullName || "", email: u.email, password: "", whatsapp: u.whatsapp || "", noRekening: u.noRekening || "", namaRekening: u.namaRekening || "" });
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditTarget(null);
    setModalError(null);
  };

  const openCreateProduct = (s: User | null = null) => {
    setEditingProduct(null);
    setTargetSeller(s);
    setSelectedSupplierId("");
    setProductForm({ name: "", description: "", price: "", unit: "kg", weight: "1", volume: "0.01" });
    setBomConversions([]);
    setBomErrors([]);
    setModalError(null);
    setModalSuccess(null);
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    const idr = p.prices?.find(x => x.currency === "IDR");
    const priceVal = idr != null ? idr.price : p.price;
    setEditingProduct(p);
    const sid = p.seller?.id;
    if (sid) {
      const sup = suppliers.find(u => u.id === sid);
      setTargetSeller(sup ?? null);
      setSelectedSupplierId(sup ? "" : sid);
    } else {
      setTargetSeller(null);
      setSelectedSupplierId("");
    }
    setProductForm({
      name: p.name,
      description: p.description || "",
      price: priceVal != null && priceVal !== undefined ? String(priceVal) : "",
      unit: p.unit || "kg",
      weight: String(p.weight ?? "1"),
      volume: p.volume || "0.01",
    });
    // Load existing BOM conversions
    const existing = Array.isArray(p.bomConversions) ? p.bomConversions : [];
    setBomConversions(existing.map(b => ({ productionUnit: b.productionUnit, conversionFactor: String(b.conversionFactor) })));
    setBomErrors(existing.map(() => ({})));
    setModalError(null);
    setModalSuccess(null);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setTargetSeller(null);
    setBomConversions([]);
    setBomErrors([]);
    setModalError(null);
  };

  // === BOM Conversion handlers ===
  const addBomRow = () => {
    setBomConversions(prev => [...prev, { productionUnit: '', conversionFactor: '' }]);
    setBomErrors(prev => [...prev, {}]);
  };

  const updateBomRow = (index: number, field: 'productionUnit' | 'conversionFactor', value: string) => {
    setBomConversions(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    setBomErrors(prev => prev.map((err, i) => i === index ? { ...err, [field]: undefined } : err));
  };

  const removeBomRow = (index: number) => {
    setBomConversions(prev => prev.filter((_, i) => i !== index));
    setBomErrors(prev => prev.filter((_, i) => i !== index));
  };

  const validateBomConversions = (): boolean => {
    const newErrors = bomConversions.map(row => {
      const err: { productionUnit?: string; conversionFactor?: string } = {};
      if (!row.productionUnit.trim()) err.productionUnit = 'Satuan produksi tidak boleh kosong';
      const factor = parseFloat(row.conversionFactor);
      if (!row.conversionFactor || isNaN(factor) || factor <= 0) err.conversionFactor = 'Faktor konversi harus lebih besar dari 0';
      return err;
    });
    setBomErrors(newErrors);
    return newErrors.every(e => !e.productionUnit && !e.conversionFactor);
  };

  // === Submit create / edit ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    setModalSuccess(null);
    try {
      if (editTarget) {
        const payload: any = { email: form.email, fullName: form.fullName, whatsapp: form.whatsapp, noRekening: form.noRekening, namaRekening: form.namaRekening };
        if (form.password) payload.password = form.password;
        await userService.updateUser(editTarget.id, payload);
        setModalSuccess(`Akun supplier ${form.fullName} berhasil diperbarui.`);
      } else {
        if (!form.password) throw new Error("Password wajib diisi untuk akun baru.");
        await userService.createUser({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          whatsapp: form.whatsapp,
          noRekening: form.noRekening,
          namaRekening: form.namaRekening,
          role: Role.SUPPLIER,
        });
        setModalSuccess(`Akun supplier ${form.fullName} berhasil ditambahkan!`);
        setForm({ fullName: "", email: "", password: "", whatsapp: "", noRekening: "", namaRekening: "" });
      }
      fetchSuppliers();
      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess(null);
      }, 1800);
    } catch (error: any) {
      setModalError(error.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBomConversions()) return;

    const bomPayload = bomConversions.map(b => ({
      productionUnit: b.productionUnit.trim(),
      conversionFactor: parseFloat(b.conversionFactor),
    }));

    if (editingProduct) {
      setSubmitting(true);
      setModalError(null);
      setModalSuccess(null);
      try {
        await tradingService.adminUpdateProduct(editingProduct.id, {
          name: productForm.name,
          description: productForm.description,
          prices: [{ currency: "IDR", price: Number(productForm.price) }],
          unit: productForm.unit,
          weight: Number(productForm.weight),
          volume: productForm.volume,
          bomConversions: bomPayload,
        });
        setModalSuccess("Perubahan produk berhasil disimpan.");
        fetchProducts();
        setTimeout(() => { closeProductModal(); }, 1200);
      } catch (err: any) {
        const msg = err?.response?.data?.message;
        setModalError(Array.isArray(msg) ? msg.join(", ") : (msg || err.message || "Gagal menyimpan produk."));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const finalSellerId = targetSeller ? targetSeller.id : selectedSupplierId;
    if (!finalSellerId) {
      setModalError("Anda harus memilih supplier untuk produk ini.");
      return;
    }

    setSubmitting(true);
    setModalError(null);
    setModalSuccess(null);
    try {
      await tradingService.createProduct({
        sellerId: finalSellerId,
        name: productForm.name,
        description: productForm.description,
        prices: [{ currency: "IDR", price: Number(productForm.price) }],
        unit: productForm.unit,
        weight: Number(productForm.weight),
        volume: productForm.volume,
        bomConversions: bomPayload.length ? bomPayload : undefined,
      });
      const finalSellerName = targetSeller ? (targetSeller.fullName || targetSeller.email) : (suppliers.find(s => s.id === finalSellerId)?.fullName || "Supplier");
      setModalSuccess(`Produk berhasil ditambahkan ke katalog ${finalSellerName}!`);
      fetchProducts();
      setTimeout(() => { closeProductModal(); }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setModalError(Array.isArray(msg) ? msg.join(", ") : (msg || err.message || "Gagal menyimpan produk."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Hapus "${p.name}" dari katalog? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await tradingService.adminDeleteProduct(p.id);
      await fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      window.alert(Array.isArray(msg) ? msg.join(", ") : (msg || err.message || "Gagal menghapus produk."));
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    let allSuppliers: User[] = [];
    try {
      const res = await userService.getAllUsers({ role: Role.SUPPLIER as any, limit: 1000 });
      allSuppliers = res.users || [];
    } catch (err) {
      console.error("Gagal mengambil daftar supplier untuk template:", err);
      allSuppliers = suppliers;
    }

    const firstSupplierEmail = (allSuppliers && allSuppliers.length > 0) ? (allSuppliers[0].email || "") : "ganti_dengan_email_supplier_valid";
    const ws = XLSX.utils.json_to_sheet([
      {
        Nama_Produk: "Daging Sapi Segar",
        Deskripsi: "Daging pilihan untuk sop",
        Harga_Satuan_IDR: 125000,
        Satuan: "kg",
        Berat_kg: 1.0,
        Volume_m3: "0.01",
        Supplier_Email_opsional: firstSupplierEmail
      }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Produk");

    const wsHelp = XLSX.utils.json_to_sheet([
      { Instruksi: "1. Jangan mengubah nama kolom di baris pertama." },
      { Instruksi: "2. Supplier_Email opsional, jika diisi dan valid maka produk ditugaskan ke supplier tersebut. Jika kosong/email salah, produk TIDAK akan diupload." },
      { Instruksi: "3. Silakan lihat sheet 'Daftar_Supplier' untuk menyalin email supplier yang valid." },
    ]);
    XLSX.utils.book_append_sheet(wb, wsHelp, "Instruksi");

    const wsSuppliers = XLSX.utils.json_to_sheet(
      allSuppliers.map((s, index) => ({
        No: index + 1,
        Nama_Supplier: s.fullName || "Tanpa Nama",
        Email: s.email,
        WhatsApp: s.whatsapp || "-",
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsSuppliers, "Daftar_Supplier");

    try {
      const bstr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([bstr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Template_Upload_Katalog_Produk.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Gagal mengunduh template: " + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setSubmitting(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (data.length === 0) {
          alert("Data excel kosong!");
          return;
        }

        let successCount = 0;
        const failedRows: { name: string; reason: string }[] = [];
        
        // Fetch fresh list of ALL suppliers to ensure we have the complete mapping
        let allSuppliers: User[] = [];
        try {
          const res = await userService.getAllUsers({ role: Role.SUPPLIER as any, limit: 1000 });
          allSuppliers = res.users || [];
        } catch (err) {
          console.error("Gagal mengambil daftar supplier terbaru:", err);
          allSuppliers = suppliers; // fallback to current state
        }
        
        if (allSuppliers.length === 0) {
          alert("Tidak ada supplier yang terdaftar di sistem.\nDaftarkan supplier terlebih dahulu sebelum mengupload katalog produk.");
          return;
        }

        const emailToId = new Map(allSuppliers.map(s => [s.email.toLowerCase().trim(), s.id]));

        // Helper function to safely parse number from string (handles comma as decimal)
        const parseExcelNum = (val: any) => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          // Replace comma with dot if present
          const clean = String(val).replace(/,/g, '.').replace(/[^0-9.]/g, '');
          const res = parseFloat(clean);
          return isNaN(res) ? 0 : res;
        };

        for (const row of data) {
          const productName = String(row.Nama_Produk || "Tanpa Nama");
          try {
            if (!row.Nama_Produk || !row.Harga_Satuan_IDR || !row.Satuan) {
              failedRows.push({ name: productName, reason: "Data tidak lengkap: Nama_Produk, Harga_Satuan_IDR, atau Satuan kosong." });
              continue;
            }

            let finalSellerId = "";
            const emailRaw = row.Supplier_Email_opsional;

            if (emailRaw && typeof emailRaw === 'string' && emailRaw.trim() !== '') {
              const mapId = emailToId.get(emailRaw.toLowerCase().trim());
              if (mapId) {
                finalSellerId = mapId;
              } else {
                // Email diisi tapi tidak cocok dengan supplier manapun
                const availableEmails = allSuppliers.map(s => s.email).join(", ");
                failedRows.push({
                  name: productName,
                  reason: `Email supplier '${emailRaw.trim()}' tidak ditemukan. Email yang valid: ${availableEmails}`
                });
                continue;
              }
            } else {
              // Email kosong — gunakan supplier pertama sebagai default
              finalSellerId = allSuppliers[0].id;
            }

            await tradingService.createProduct({
              sellerId: finalSellerId,
              name: String(row.Nama_Produk),
              description: row.Deskripsi || "",
              prices: [{ currency: "IDR", price: parseExcelNum(row.Harga_Satuan_IDR) }],
              unit: String(row.Satuan),
              weight: parseExcelNum(row.Berat_kg) || 1.0,
              volume: parseExcelNum(row.Volume_m3 || "0.01").toString()
            });
            successCount++;
          } catch (err: any) {
            const apiMsg = err?.response?.data?.message;
            const errMsg = Array.isArray(apiMsg) ? apiMsg.join(", ") : (apiMsg || err.message || "Gagal upload ke server.");
            failedRows.push({ name: productName, reason: errMsg });
          }
        }

        const failCount = failedRows.length;
        let summaryMsg = `Upload selesai!\nBerhasil: ${successCount}\nGagal: ${failCount}`;
        if (failedRows.length > 0) {
          summaryMsg += "\n\nDetail kegagalan:";
          failedRows.slice(0, 10).forEach((f, i) => {
            summaryMsg += `\n${i + 1}. "${f.name}": ${f.reason}`;
          });
          if (failedRows.length > 10) {
            summaryMsg += `\n... dan ${failedRows.length - 10} produk lainnya gagal.`;
          }
        }
        alert(summaryMsg);
        fetchProducts();
      } catch (err: any) {
        alert("Gagal membaca file excel: " + err.message);
      } finally {
        setSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };
  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiPackage className="text-amber-600" /> Katalog & Supplier
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Kelola data supplier dan lihat katalog produk untuk Dapur MBG.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("catalog")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === "catalog" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <FiPackage className="h-3.5 w-3.5" /> Katalog
              </button>
              <button
                onClick={() => setViewMode("suppliers")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  viewMode === "suppliers" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <FiUsers className="h-3.5 w-3.5" /> Supplier
              </button>
            </div>

            {viewMode === "suppliers" && (
              <button
                id="btn-tambah-supplier"
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium text-sm shadow-sm whitespace-nowrap"
              >
                <FiPlus /> Tambah Supplier
              </button>
            )}
            {viewMode === "catalog" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium text-sm shadow-sm whitespace-nowrap"
                  title="Unduh Template Excel"
                >
                  <FiDownload /> Template
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-green-700 rounded-lg hover:bg-green-100 transition font-medium text-sm shadow-sm whitespace-nowrap"
                  title="Upload Data Excel"
                >
                  <FiUpload /> Upload
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                <button
                  onClick={() => openCreateProduct(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium text-sm shadow-sm whitespace-nowrap"
                >
                  <FiPlus /> Tambah Produk
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search bar (catalog only) */}
        {viewMode === "catalog" && (
          <div className="mt-4 relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Cari nama produk, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
          </div>
        )}
      </div>

      {/* =================== CATALOG VIEW =================== */}
      {viewMode === "catalog" && (
        <>
          {loadingProducts ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="inline-block w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-gray-100 text-gray-400 p-5 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FiPackage className="h-8 w-8" />
              </div>
              <p className="text-gray-700 font-medium">Belum ada produk di katalog</p>
              <p className="text-gray-500 text-sm mt-1">Produk dari supplier yang sudah di-approve akan muncul di sini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map(product => {
                const coverImage = getCoverImage(product);
                return (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group flex flex-col">
                    <div className="h-48 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                      {coverImage ? (
                        <img src={coverImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <FiImage className="h-12 w-12 text-gray-300" />
                      )}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                        {product.weight} kg
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="mb-1 text-xs font-medium text-amber-600 uppercase tracking-wide">
                        {product.seller?.companyName || product.seller?.fullname || "Supplier Internal"}
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">{product.description || "Tidak ada deskripsi"}</p>
                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">Harga per {product.unit}</p>
                          <p className="font-bold text-slate-900">{getPrice(product)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditProduct(product)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          >
                            <FiEdit2 className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" /> Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* =================== SUPPLIER VIEW =================== */}
      {viewMode === "suppliers" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Cari nama atau email supplier..."
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{suppliers.length} supplier terdaftar</span>
              <button onClick={fetchSuppliers} className="p-2 text-gray-400 hover:text-gray-700 transition" title="Refresh">
                <FiRefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Table */}
          {loadingSuppliers ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-3" />
              <p className="text-gray-500 text-sm">Memuat data supplier...</p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-100 text-gray-400 p-5 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FiUsers className="h-8 w-8" />
              </div>
              <p className="text-gray-700 font-medium">Belum ada supplier</p>
              <p className="text-gray-500 text-sm mt-1">Klik "Tambah Supplier" untuk mendaftarkan supplier baru.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Nama Supplier</th>
                    <th className="px-6 py-3 text-left font-semibold">Email</th>
                    <th className="px-6 py-3 text-left font-semibold">Dibuat</th>
                    <th className="px-6 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {(s.fullName || s.email).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">
                            {s.fullName || <span className="text-gray-400 italic">—</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{s.email}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button
                          id={`btn-edit-supplier-${s.id}`}
                          onClick={() => openEdit(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <FiEdit2 className="h-3.5 w-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================== MODAL TAMBAH / EDIT SUPPLIER =================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="p-5 bg-gray-50 border-b flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-700 rounded-md">
                  {editTarget ? <FiEdit2 className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
                </span>
                {editTarget ? "Edit Akun Supplier" : "Tambah Akun Supplier Baru"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {modalSuccess && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center gap-2 text-sm font-medium">
                  <FiCheck className="flex-shrink-0" /> {modalSuccess}
                </div>
              )}
              {modalError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-sm font-medium">
                  <FiX className="flex-shrink-0" /> {modalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nama */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nama Supplier / Nama Perusahaan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={e => setForm({ ...form, fullName: e.target.value })}
                      placeholder="CV Aneka Buah / PT. Sentra Pangan"
                      className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Alamat Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="supplier@email.com"
                      className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Email ini akan digunakan untuk login Supplier.</p>
                </div>

                {/* No Whatsapp */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    No. Whatsapp / Telepon
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">+62</span>
                    <input
                      type="tel"
                      value={form.whatsapp}
                      onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                      placeholder="81234567890"
                      className="pl-11 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Isi dengan digit awalan 8 (contoh: 8123456...)</p>
                </div>

                {/* Bank Account Info: noRekening and namaRekening */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      No. Rekening
                    </label>
                    <input
                      type="text"
                      value={form.noRekening}
                      onChange={e => setForm({ ...form, noRekening: e.target.value })}
                      placeholder="1234567890"
                      className="px-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nama Pemilik Rekening
                    </label>
                    <input
                      type="text"
                      value={form.namaRekening}
                      onChange={e => setForm({ ...form, namaRekening: e.target.value })}
                      placeholder="A/N Rekening"
                      className="px-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {editTarget ? (
                      <>Password <span className="text-gray-400 font-normal">(kosongkan jika tidak ingin ganti)</span></>
                    ) : (
                      <>Password Sementara <span className="text-red-500">*</span></>
                    )}
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="password"
                      required={!editTarget}
                      minLength={editTarget ? undefined : 6}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder={editTarget ? "Biarkan kosong jika tidak diubah" : "Min. 6 karakter"}
                      className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t mt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-70 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menyimpan...
                      </>
                    ) : editTarget ? "Simpan Perubahan" : "Simpan Supplier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =================== MODAL TAMBAH PRODUK UNTUK SUPPLIER =================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-gray-50 border-b flex items-center justify-between shrink-0">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-700 rounded-md">
                  {editingProduct ? <FiEdit2 className="h-4 w-4" /> : <FiPackage className="h-4 w-4" />}
                </span>
                {editingProduct ? "Edit Produk Katalog" : "Tambah Produk Katalog"}
              </h2>
              <button onClick={closeProductModal} className="text-slate-400 hover:text-slate-600 transition">
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {editingProduct && (
                <div className="mb-4 text-sm text-gray-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  Supplier:{" "}
                  <strong className="text-slate-800">
                    {targetSeller?.fullName || targetSeller?.email || editingProduct.seller?.fullname || editingProduct.seller?.email || "—"}
                  </strong>
                  <span className="text-gray-400 text-xs block mt-1">Pemilik produk tidak dapat diubah dari sini.</span>
                </div>
              )}
              {!editingProduct && targetSeller && (
                <div className="mb-4 text-sm text-gray-500 bg-amber-50 rounded-lg p-3 border border-amber-100">
                  Produk ini akan dimasukkan ke katalog atas nama Supplier: <strong className="text-amber-800">{targetSeller.fullName || targetSeller.email}</strong>
                </div>
              )}

              {modalSuccess && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center gap-2 text-sm font-medium">
                  <FiCheck className="flex-shrink-0" /> {modalSuccess}
                </div>
              )}
              {modalError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-sm font-medium">
                  <FiX className="flex-shrink-0" /> {modalError}
                </div>
              )}

              <form onSubmit={handleProductSubmit} className="space-y-4">
                {!editingProduct && !targetSeller && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Supplier <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={selectedSupplierId}
                      onChange={e => setSelectedSupplierId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 bg-white"
                    >
                      <option value="">-- Pilih Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.fullName || s.email}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Produk <span className="text-red-500">*</span></label>
                  <input type="text" required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} placeholder="Cth: Ayam Broiler Utuh" className="w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi & Spesifikasi</label>
                  <textarea rows={3} value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} placeholder="Kondisi, ukuran, min. order..." className="w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Harga Satuan (IDR) <span className="text-red-500">*</span></label>
                    <input type="number" required min="0" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} placeholder="Cth: 25000" className="w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit Satuan <span className="text-red-500">*</span></label>
                    <input type="text" required value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })} placeholder="Cth: kg, ekor, liter" className="w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Perkiraan Berat (kg) <span className="text-red-500">*</span></label>
                    <input type="number" required min="0" step="0.01" value={productForm.weight} onChange={e => setProductForm({ ...productForm, weight: e.target.value })} placeholder="1.0" className="w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2" />
                    <p className="text-[10px] text-gray-400 mt-1">Berat per satuan untuk kalkulasi pengiriman laut (CBM)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Volume Ruang (m³) <span className="text-red-500">*</span></label>
                    <input type="text" required value={productForm.volume} onChange={e => setProductForm({ ...productForm, volume: e.target.value })} placeholder="0.01" className="w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2" />
                  </div>
                </div>

                {/* BOM Conversion Section */}
                <BomConversionSection
                  catalogUnit={productForm.unit}
                  conversions={bomConversions}
                  errors={bomErrors}
                  onAdd={addBomRow}
                  onChange={updateBomRow}
                  onRemove={removeBomRow}
                />

                <div className="pt-4 flex items-center justify-end gap-3 border-t mt-4">
                  <button type="button" onClick={closeProductModal} className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition">Batal</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-70 disabled:cursor-not-allowed transition flex items-center gap-2">
                    {submitting ? "Menyimpan..." : editingProduct ? "Simpan Perubahan" : "Simpan Produk"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
