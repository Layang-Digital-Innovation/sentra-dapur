# Requirements Document

## Introduction

Fitur ini menambahkan kemampuan konversi satuan dari produk katalog (trading) ke satuan produksi (BOM) pada platform Sentra Dapur MBG. Saat ini, produk katalog hanya memiliki satu satuan (misalnya TON, KG), sedangkan tim produksi membutuhkan bahan baku dalam satuan yang berbeda (misalnya gram, ml, liter). Fitur "Konversi ke BOM" memungkinkan supplier mendefinisikan faktor konversi saat mendaftarkan atau mengedit produk katalog, sehingga tim produksi dapat secara otomatis mengetahui berapa unit produksi yang tersedia dari setiap unit katalog yang dibeli.

## Glossary

- **Product**: Model produk katalog yang didaftarkan oleh Supplier di modul Trading, memiliki satuan katalog (unit) seperti TON, KG, PCS.
- **ProductBomConversion**: Model baru yang menyimpan aturan konversi dari satuan katalog ke satuan produksi untuk sebuah Product.
- **BOM (Bill of Materials)**: Daftar bahan baku yang digunakan dalam proses produksi, dikelola melalui model MenuIngredient.
- **MenuIngredient**: Model yang merepresentasikan bahan baku dalam BOM, memiliki field `unit` (satuan produksi) dan `gramsPerPortion`.
- **Catalog_Unit**: Satuan yang digunakan pada produk katalog (contoh: TON, KG, PCS, LITER).
- **Production_Unit**: Satuan yang digunakan oleh tim produksi dalam BOM (contoh: gram, ml, liter, pcs).
- **Conversion_Factor**: Angka yang menyatakan berapa banyak Production_Unit yang setara dengan 1 Catalog_Unit. Contoh: 1 KG = 1000 gram, maka conversionFactor = 1000.
- **Supplier**: Pengguna dengan role SUPPLIER yang mendaftarkan produk katalog.
- **Admin_Pusat**: Pengguna dengan role ADMIN_PUSAT yang dapat mengelola produk katalog atas nama supplier.
- **Trading_Service**: Layanan backend NestJS yang mengelola modul trading di `backend/src/trading/`.
- **Create_Product_Page**: Halaman frontend untuk membuat produk baru di `frontend/src/app/dashboard/products/create/page.tsx`.
- **Edit_Product_Page**: Halaman frontend untuk mengedit produk di `frontend/src/app/dashboard/products/[id]/`.

---

## Requirements

### Requirement 1: Model Data ProductBomConversion

**User Story:** Sebagai developer, saya ingin ada model data `ProductBomConversion` di database, agar konversi satuan katalog ke satuan produksi dapat disimpan dan dikelola secara persisten.

#### Acceptance Criteria

1. THE Trading_Service SHALL menyimpan data konversi BOM dalam model `ProductBomConversion` yang memiliki field: `id` (UUID), `productId` (relasi ke Product), `productionUnit` (string, satuan produksi), `conversionFactor` (float, jumlah satuan produksi per 1 satuan katalog), `createdAt`, dan `updatedAt`.
2. THE `ProductBomConversion` SHALL memiliki relasi many-to-one ke model `Product` (satu produk dapat memiliki banyak konversi ke satuan produksi yang berbeda).
3. WHEN sebuah `Product` dihapus, THE Trading_Service SHALL menghapus semua `ProductBomConversion` yang terkait secara otomatis (cascade delete).
4. THE `ProductBomConversion` SHALL memiliki constraint unique pada kombinasi `productId` dan `productionUnit`, sehingga tidak ada duplikasi konversi untuk satuan produksi yang sama pada satu produk.

---

### Requirement 2: API Backend - Membuat Produk dengan Konversi BOM

**User Story:** Sebagai Supplier, saya ingin dapat mendefinisikan konversi BOM saat membuat produk baru, agar tim produksi langsung mengetahui faktor konversi satuan tanpa konfigurasi tambahan.

#### Acceptance Criteria

1. WHEN Supplier mengirim request `POST /trading/products` dengan field `bomConversions` (array opsional), THE Trading_Service SHALL menyimpan data `ProductBomConversion` bersama data produk dalam satu transaksi database.
2. THE Trading_Service SHALL menerima `bomConversions` dalam format array objek `{ productionUnit: string, conversionFactor: number }`.
3. IF `bomConversions` tidak disertakan dalam request, THEN THE Trading_Service SHALL membuat produk tanpa data konversi BOM (field bersifat opsional).
4. IF `conversionFactor` bernilai kurang dari atau sama dengan 0, THEN THE Trading_Service SHALL mengembalikan error validasi dengan status HTTP 400.
5. IF `productionUnit` kosong atau hanya berisi spasi, THEN THE Trading_Service SHALL mengembalikan error validasi dengan status HTTP 400.
6. WHEN produk berhasil dibuat, THE Trading_Service SHALL mengembalikan data produk beserta array `bomConversions` dalam response.

---

### Requirement 3: API Backend - Memperbarui Konversi BOM pada Produk

**User Story:** Sebagai Supplier, saya ingin dapat menambah, mengubah, atau menghapus konversi BOM saat mengedit produk, agar data konversi selalu akurat sesuai kondisi terkini.

#### Acceptance Criteria

1. WHEN Supplier mengirim request `PUT /trading/products/:id` dengan field `bomConversions`, THE Trading_Service SHALL mengganti seluruh data `ProductBomConversion` yang ada untuk produk tersebut dengan data baru (replace strategy).
2. IF `bomConversions` adalah array kosong `[]`, THEN THE Trading_Service SHALL menghapus semua konversi BOM yang ada untuk produk tersebut.
3. IF `bomConversions` tidak disertakan dalam request update, THEN THE Trading_Service SHALL mempertahankan data konversi BOM yang sudah ada tanpa perubahan.
4. WHEN data konversi BOM diperbarui, THE Trading_Service SHALL melakukan operasi delete-then-insert dalam satu transaksi database untuk menjaga konsistensi data.
5. IF Supplier mencoba memperbarui produk milik Supplier lain, THEN THE Trading_Service SHALL mengembalikan error dengan status HTTP 403.

---

### Requirement 4: API Backend - Membaca Data Konversi BOM

**User Story:** Sebagai tim produksi atau buyer, saya ingin dapat melihat konversi BOM pada detail produk, agar saya dapat merencanakan kebutuhan bahan baku dengan tepat.

#### Acceptance Criteria

1. WHEN request `GET /trading/products/:id` diterima, THE Trading_Service SHALL menyertakan array `bomConversions` dalam response data produk.
2. WHEN request `GET /trading/products` (list produk approved) diterima, THE Trading_Service SHALL menyertakan array `bomConversions` dalam setiap item produk pada response.
3. WHEN request `GET /trading/seller/products` diterima, THE Trading_Service SHALL menyertakan array `bomConversions` dalam setiap item produk milik seller tersebut.
4. IF sebuah produk tidak memiliki konversi BOM, THEN THE Trading_Service SHALL mengembalikan array kosong `[]` untuk field `bomConversions`.

---

### Requirement 5: UI Frontend - Form Konversi BOM pada Halaman Create Product

**User Story:** Sebagai Supplier, saya ingin ada bagian "Konversi ke BOM" pada form tambah produk, agar saya dapat mendefinisikan faktor konversi satuan langsung saat mendaftarkan produk baru.

#### Acceptance Criteria

1. THE Create_Product_Page SHALL menampilkan bagian "Konversi ke BOM" di bawah bagian informasi produk utama.
2. THE Create_Product_Page SHALL menampilkan tombol "Tambah Konversi" yang memungkinkan Supplier menambahkan baris konversi baru.
3. WHEN Supplier mengklik "Tambah Konversi", THE Create_Product_Page SHALL menampilkan baris input baru dengan field: `productionUnit` (teks, contoh: gram, ml) dan `conversionFactor` (angka, contoh: 1000).
4. THE Create_Product_Page SHALL menampilkan label deskriptif yang menjelaskan arti konversi, contoh: "1 [unit katalog] = [conversionFactor] [productionUnit]".
5. THE Create_Product_Page SHALL memungkinkan Supplier menghapus baris konversi yang sudah ditambahkan dengan tombol hapus per baris.
6. WHEN Supplier mengisi `conversionFactor` dengan nilai 0 atau negatif, THE Create_Product_Page SHALL menampilkan pesan validasi error pada field tersebut sebelum form disubmit.
7. WHEN Supplier mengosongkan field `productionUnit` pada baris konversi yang sudah ditambahkan, THE Create_Product_Page SHALL menampilkan pesan validasi error pada field tersebut sebelum form disubmit.
8. WHEN form disubmit, THE Create_Product_Page SHALL menyertakan data `bomConversions` dalam payload request ke backend.
9. WHERE bagian "Konversi ke BOM" tidak diisi (tidak ada baris konversi), THE Create_Product_Page SHALL tetap mengizinkan form disubmit tanpa data konversi BOM (opsional).

---

### Requirement 6: UI Frontend - Form Konversi BOM pada Halaman Edit Product

**User Story:** Sebagai Supplier, saya ingin dapat melihat dan mengedit konversi BOM yang sudah ada pada halaman edit produk, agar saya dapat memperbarui faktor konversi jika ada perubahan.

#### Acceptance Criteria

1. WHEN halaman Edit_Product_Page dimuat, THE Edit_Product_Page SHALL mengambil data produk termasuk `bomConversions` yang sudah tersimpan dan menampilkannya pada form.
2. THE Edit_Product_Page SHALL menampilkan baris konversi yang sudah ada dengan nilai `productionUnit` dan `conversionFactor` yang terisi.
3. THE Edit_Product_Page SHALL memungkinkan Supplier menambah baris konversi baru, mengubah nilai yang ada, atau menghapus baris konversi yang sudah ada.
4. WHEN form edit disubmit, THE Edit_Product_Page SHALL mengirim seluruh data `bomConversions` (termasuk yang baru, yang diubah, dan yang tersisa setelah penghapusan) ke backend.

---

### Requirement 7: Integrasi dengan Kalkulasi Kebutuhan Bahan Baku

**User Story:** Sebagai tim produksi, saya ingin sistem dapat menggunakan data konversi BOM saat menghitung kebutuhan bahan baku dari rencana menu, agar hasil kalkulasi PO sudah dalam satuan katalog yang bisa langsung digunakan untuk pembelian.

#### Acceptance Criteria

1. WHEN kalkulasi kebutuhan bahan baku (`GET /produksi/rencana/:id/kalkulasi`) dijalankan, THE Trading_Service SHALL menyediakan data `ProductBomConversion` yang dapat diakses oleh modul produksi.
2. THE `ProductBomConversion` SHALL dapat di-query berdasarkan `productionUnit` untuk menemukan produk katalog yang sesuai dengan bahan baku dalam BOM.
3. WHERE data `ProductBomConversion` tersedia untuk sebuah bahan baku, THE Trading_Service SHALL memungkinkan konversi dari total kebutuhan satuan produksi ke satuan katalog menggunakan formula: `jumlah_katalog = total_produksi / conversionFactor`.
