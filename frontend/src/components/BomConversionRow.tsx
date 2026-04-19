"use client";

interface BomConversionRowProps {
  index: number;
  productionUnit: string;
  conversionFactor: string;
  catalogUnit: string;
  onChange: (index: number, field: 'productionUnit' | 'conversionFactor', value: string) => void;
  onRemove: (index: number) => void;
  errors?: { productionUnit?: string; conversionFactor?: string };
}

export default function BomConversionRow({
  index,
  productionUnit,
  conversionFactor,
  catalogUnit,
  onChange,
  onRemove,
  errors,
}: BomConversionRowProps) {
  const factorNum = parseFloat(conversionFactor);
  const isValid = catalogUnit && productionUnit.trim() && conversionFactor && factorNum > 0;

  return (
    <div className="group relative">
      <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 bg-white ${
        errors?.productionUnit || errors?.conversionFactor
          ? 'border-red-200 bg-red-50/30'
          : 'border-gray-200 hover:border-blue-200 hover:shadow-sm'
      }`}>
        {/* Index badge */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mt-2">
          <span className="text-[10px] font-bold text-blue-500">{index + 1}</span>
        </div>

        {/* Inputs */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {/* Production Unit */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Satuan Produksi
            </label>
            <input
              type="text"
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium border transition-all outline-none
                ${errors?.productionUnit
                  ? 'border-red-300 bg-red-50 text-red-800 placeholder-red-300 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100'
                }`}
              placeholder="gram, ml, liter..."
              value={productionUnit}
              onChange={(e) => onChange(index, 'productionUnit', e.target.value)}
            />
            {errors?.productionUnit && (
              <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.productionUnit}
              </p>
            )}
          </div>

          {/* Conversion Factor */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Faktor Konversi
            </label>
            <input
              type="number"
              step="any"
              min="0.000001"
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium border transition-all outline-none
                ${errors?.conversionFactor
                  ? 'border-red-300 bg-red-50 text-red-800 placeholder-red-300 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100'
                }`}
              placeholder="1000"
              value={conversionFactor}
              onChange={(e) => onChange(index, 'conversionFactor', e.target.value)}
            />
            {errors?.conversionFactor && (
              <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.conversionFactor}
              </p>
            )}
          </div>
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="flex-shrink-0 mt-2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
          title="Hapus konversi"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Preview pill */}
      {isValid && (
        <div className="mt-1.5 ml-9 flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100">
            <span className="text-[11px] font-semibold text-blue-700">
              1 {catalogUnit.toUpperCase()}
            </span>
            <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="text-[11px] font-semibold text-blue-700">
              {factorNum.toLocaleString('id-ID')} {productionUnit.trim()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
