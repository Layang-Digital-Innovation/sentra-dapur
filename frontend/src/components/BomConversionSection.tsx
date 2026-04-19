"use client";

import BomConversionRow from "./BomConversionRow";

export interface BomConversionItem {
  productionUnit: string;
  conversionFactor: string;
}

export interface BomConversionError {
  productionUnit?: string;
  conversionFactor?: string;
}

interface BomConversionSectionProps {
  catalogUnit: string;
  conversions: BomConversionItem[];
  errors: BomConversionError[];
  onAdd: () => void;
  onChange: (index: number, field: 'productionUnit' | 'conversionFactor', value: string) => void;
  onRemove: (index: number) => void;
}

export default function BomConversionSection({
  catalogUnit,
  conversions,
  errors,
  onAdd,
  onChange,
  onRemove,
}: BomConversionSectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="flex items-center gap-2.5">
          {/* Icon */}
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Konversi ke BOM</p>
            <p className="text-[11px] text-gray-500 leading-tight">
              Satuan katalog → satuan produksi tim dapur
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah
        </button>
      </div>

      {/* Body */}
      <div className="p-4 bg-white">
        {conversions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Belum ada konversi.{" "}
              <button
                type="button"
                onClick={onAdd}
                className="text-blue-500 hover:text-blue-700 font-medium underline underline-offset-2"
              >
                Tambah sekarang
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversions.map((row, idx) => (
              <BomConversionRow
                key={idx}
                index={idx}
                productionUnit={row.productionUnit}
                conversionFactor={row.conversionFactor}
                catalogUnit={catalogUnit}
                onChange={onChange}
                onRemove={onRemove}
                errors={errors[idx]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {conversions.length > 0 && (
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[11px] text-gray-400">
            Contoh: 1 {catalogUnit ? catalogUnit.toUpperCase() : 'KG'} = 1.000 gram. Faktor konversi harus lebih besar dari 0.
          </p>
        </div>
      )}
    </div>
  );
}
