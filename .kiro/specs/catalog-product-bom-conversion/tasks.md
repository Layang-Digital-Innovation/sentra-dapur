# Implementation Plan: Konversi ke BOM (Catalog Product BOM Conversion)

## Overview

Implementasi fitur konversi satuan produk katalog ke satuan produksi (BOM) secara incremental: mulai dari schema database, backend service/controller, hingga UI frontend pada halaman create dan edit produk.

## Tasks

- [x] 1. Tambah model `ProductBomConversion` ke Prisma schema dan jalankan migrasi
  - Tambah model `ProductBomConversion` di `backend/prisma/schema.prisma` dengan field: `id`, `productId`, `productionUnit`, `conversionFactor`, `createdAt`, `updatedAt`
  - Tambah constraint `@@unique([productId, productionUnit])` dan index `@@index([productionUnit])`
  - Tambah relasi `bomConversions ProductBomConversion[]` ke model `Product`
  - Tambah relasi `onDelete: Cascade` dari `ProductBomConversion` ke `Product`
  - Buat file migrasi baru dengan `prisma migrate dev --name add_product_bom_conversion`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implementasi logika backend di `TradingService`
  - [x] 2.1 Tambah validasi dan penyimpanan `bomConversions` di method `createProduct`
    - Tambah parameter `bomConversions?: Array<{ productionUnit: string; conversionFactor: number }>` ke signature method
    - Tambah validasi: tolak jika ada `conversionFactor <= 0` (throw `BadRequestException`)
    - Tambah validasi: tolak jika ada `productionUnit` kosong/whitespace (throw `BadRequestException`)
    - Simpan `bomConversions` dalam transaksi Prisma bersama data produk menggunakan `create` nested
    - Sertakan `include: { bomConversions: true }` di semua query return produk
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 Tulis property test untuk `createProduct` — Property 2: Create produk menyimpan semua konversi BOM
    - **Property 2: Create produk menyimpan semua konversi BOM**
    - **Validates: Requirements 2.1, 2.6**

  - [ ]* 2.3 Tulis property test untuk validasi — Property 3 & 4: Validasi conversionFactor dan productionUnit
    - **Property 3: Validasi conversionFactor menolak nilai tidak valid**
    - **Property 4: Validasi productionUnit menolak string kosong/whitespace**
    - **Validates: Requirements 2.4, 2.5**

  - [x] 2.4 Modifikasi method `applyProductFieldsUpdate` untuk replace strategy `bomConversions`
    - Tambah parameter `bomConversions?: Array<{ productionUnit: string; conversionFactor: number }> | null` ke data partial
    - Jika `bomConversions` adalah array (termasuk `[]`): hapus semua konversi lama lalu insert yang baru dalam satu transaksi
    - Jika `bomConversions` adalah `undefined`: pertahankan konversi yang ada tanpa perubahan
    - Tambah validasi yang sama (conversionFactor > 0, productionUnit tidak kosong) sebelum operasi database
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 2.5 Tulis property test untuk `applyProductFieldsUpdate` — Property 5: Replace strategy mengganti seluruh konversi BOM
    - **Property 5: Replace strategy mengganti seluruh konversi BOM**
    - **Validates: Requirements 3.1, 3.4**

  - [x] 2.6 Tambah method baru `getBomConversionsByUnit` di `TradingService`
    - Query `ProductBomConversion` berdasarkan `productionUnit` (exact match)
    - Include relasi `product` dengan field yang relevan
    - _Requirements: 7.1, 7.2_

  - [ ]* 2.7 Tulis property test untuk `getBomConversionsByUnit` — Property 8: Query konversi BOM berdasarkan productionUnit
    - **Property 8: Query konversi BOM berdasarkan productionUnit mengembalikan hasil yang tepat**
    - **Validates: Requirements 7.2**

- [x] 3. Update semua query GET produk agar menyertakan `bomConversions`
  - Tambah `bomConversions: true` ke `include` di method `getApprovedProducts`
  - Tambah `bomConversions: true` ke `include` di method `getProductById`
  - Tambah `bomConversions: true` ke `include` di method `getSellerProducts`
  - Tambah `bomConversions: true` ke `include` di method `getAllProducts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.1 Tulis property test — Property 7: Semua endpoint GET produk menyertakan field bomConversions
    - **Property 7: Semua endpoint GET produk menyertakan field bomConversions**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 4. Update `TradingController` dan tambah endpoint baru
  - Perluas body type `POST /trading/products` dengan field `bomConversions?`
  - Teruskan `bomConversions` dari body ke `tradingService.createProduct`
  - Perluas body type `PUT /trading/products/:id` dengan field `bomConversions?`
  - Tambah endpoint `GET /trading/bom-conversions?productionUnit=` yang memanggil `getBomConversionsByUnit`
  - _Requirements: 2.1, 3.1, 7.1_

- [x] 5. Checkpoint — Pastikan semua tests backend pass
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [x] 6. Update `tradingService` di frontend
  - Perluas type parameter `createProduct` dengan `bomConversions?: Array<{ productionUnit: string; conversionFactor: number }>`
  - Perluas type parameter `updateProduct` dengan `bomConversions?: Array<{ productionUnit: string; conversionFactor: number }> | null`
  - Tambah method `getBomConversionsByUnit(productionUnit: string)` yang memanggil `GET /trading/bom-conversions?productionUnit=`
  - _Requirements: 5.8, 6.4_

- [x] 7. Buat komponen `BomConversionRow` di frontend
  - Buat file `frontend/src/components/BomConversionRow.tsx`
  - Implementasi props: `index`, `productionUnit`, `conversionFactor` (string), `catalogUnit`, `onChange`, `onRemove`, `errors`
  - Tampilkan dua input field: `productionUnit` (text) dan `conversionFactor` (number)
  - Tampilkan label preview dinamis: `"1 {catalogUnit} = {conversionFactor} {productionUnit}"`
  - Tampilkan tombol hapus per baris
  - Tampilkan pesan error per field jika `errors` ada
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 7.1 Tulis property test untuk `BomConversionRow` — Property 10: Label preview mencerminkan nilai input
    - **Property 10: Label preview konversi di UI mencerminkan nilai input**
    - **Validates: Requirements 5.4**

- [x] 8. Integrasikan section "Konversi ke BOM" ke halaman Create Product
  - Tambah state `bomConversions: Array<{ productionUnit: string; conversionFactor: string }>` di `frontend/src/app/dashboard/products/create/page.tsx`
  - Tambah state `bomErrors` untuk validasi per baris
  - Tambah section "Konversi ke BOM" di bawah form utama dengan tombol "Tambah Konversi"
  - Render `BomConversionRow` untuk setiap item di state `bomConversions`
  - Implementasi handler `addBomRow`, `updateBomRow`, `removeBomRow`
  - Tambah validasi client-side sebelum submit: `conversionFactor > 0` dan `productionUnit` tidak kosong
  - Sertakan `bomConversions` (dikonversi ke number) dalam payload `tradingService.createProduct`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]* 8.1 Tulis property test — Property 11: Jumlah baris konversi di UI sesuai dengan aksi tambah/hapus
    - **Property 11: Jumlah baris konversi di UI sesuai dengan aksi tambah/hapus**
    - **Validates: Requirements 5.3, 5.5**

- [x] 9. Integrasikan section "Konversi ke BOM" ke halaman Edit Product
  - Modifikasi `frontend/src/app/dashboard/products/[id]/edit/page.tsx`
  - Saat data produk di-load, inisialisasi state `bomConversions` dari `product.bomConversions` yang ada
  - Tampilkan section "Konversi ke BOM" dengan baris yang sudah terisi dari data existing
  - Gunakan komponen `BomConversionRow` yang sama dengan halaman create
  - Sertakan `bomConversions` dalam payload `tradingService.updateProduct` saat submit
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10. Checkpoint akhir — Pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- Property tests menggunakan **fast-check** sesuai testing strategy di design document
- Replace strategy pada update: jika `bomConversions` array dikirim → replace; jika `undefined` → pertahankan yang ada
