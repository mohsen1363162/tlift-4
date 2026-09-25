import React, { useState } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  Settings,
  RotateCw,
  FileText,
  Sheet,
} from "lucide-react";
import type { Theme } from "../theme";

export interface TableToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  onOpenFilter?: () => void;
  onOpenSettings?: () => void;
  onRefresh?: () => void;
  onPrint?: () => void;
  onExportExcel?: () => void;
  hasActiveFilters?: boolean;
  t: Theme;
  children?: React.ReactNode;
}

export default function TableToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "جستجو...",
  onOpenFilter,
  onOpenSettings,
  onRefresh,
  onPrint,
  onExportExcel,
  hasActiveFilters = false,
  t,
  children,
}: TableToolbarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 border-b ${t.border} px-3 py-2`}>
      {/* Auto Search Bar */}
      <div className={`flex h-8 w-[230px] items-center gap-2 rounded border px-2 ${t.input}`}>
        {searchQuery ? (
          <X
            size={14}
            className={`cursor-pointer ${t.sub} hover:text-red-400`}
            onClick={() => onSearchChange("")}
          />
        ) : null}
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-right text-[12px] outline-none"
        />
        <Search size={14} className={t.sub} />
      </div>

      {/* 5 Standard Action Buttons (as specified in screenshots 37-40) */}
      <div className="flex items-center gap-0.5">
        {/* 1. Filter / Abacus with red badge */}
        {onOpenFilter && (
          <button
            type="button"
            onClick={onOpenFilter}
            title="فیلترهای پیشرفته"
            className={`relative rounded p-1.5 transition ${t.hover} ${t.sub}`}
          >
            {hasActiveFilters && (
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-400/30" />
            )}
            <SlidersHorizontal size={17} />
          </button>
        )}

        {/* 2. Column Settings */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="تنظیمات جدول"
            className={`rounded p-1.5 transition ${t.hover} ${t.sub}`}
          >
            <Settings size={17} />
          </button>
        )}

        {/* 3. Refresh */}
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefreshClick}
            title="رفرش و تازه‌سازی"
            className={`rounded p-1.5 transition ${t.hover} ${t.sub}`}
          >
            <RotateCw size={17} className={isRefreshing ? "animate-spin text-violet-400" : ""} />
          </button>
        )}

        {/* 4. Print */}
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            title="پرینت جدول"
            className={`rounded p-1.5 transition ${t.hover} ${t.sub}`}
          >
            <FileText size={17} />
          </button>
        )}

        {/* 5. Excel Download */}
        {onExportExcel && (
          <button
            type="button"
            onClick={onExportExcel}
            title="دانلود فایل اکسل"
            className={`rounded p-1.5 transition ${t.hover} ${t.sub}`}
          >
            <Sheet size={17} />
          </button>
        )}
      </div>

      {/* Additional slot for custom buttons and badges */}
      {children}
    </div>
  );
}
