import React from "react";
import { Printer, X } from "lucide-react";
import type { Theme } from "../theme";

export type PrintColumn<T> = {
  key: keyof T | string;
  title: string;
  render?: (item: T) => React.ReactNode;
  align?: "right" | "center" | "left";
};

export default function PrintTableModal<T extends Record<string, unknown>>({
  isOpen,
  onClose,
  title,
  subtitle,
  data,
  columns,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: T[];
  columns: PrintColumn<T>[];
  t: Theme;
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg bg-white text-neutral-900 shadow-2xl overflow-hidden font-[Tahoma,system-ui]">
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b bg-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-violet-600" />
            <span className="font-bold text-[14px]">پیش‌نمایش چاپ: {title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded bg-violet-600 px-4 py-1.5 text-[12.5px] font-medium text-white shadow hover:bg-violet-700 transition"
            >
              <Printer size={15} />
              <span>ارسال به چاپگر</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-neutral-500 hover:bg-neutral-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Print Document Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-5 bg-white text-neutral-900">
          {/* Document Header */}
          <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-4 text-right">
            <div>
              <h2 className="text-[17px] font-black text-neutral-900">
                شرکت فنی و مهندسی آسانسور توانمند
              </h2>
              <p className="text-[12.5px] text-neutral-600 mt-1">
                {title} {subtitle ? `- ${subtitle}` : ""}
              </p>
            </div>
            <div className="text-left text-[11.5px] text-neutral-600 space-y-1">
              <div>تاریخ گزارش: <span className="font-semibold text-neutral-900">{new Date().toLocaleDateString("fa-IR")}</span></div>
              <div>تعداد کل ردیف‌ها: <span className="font-semibold text-neutral-900">{data.length.toLocaleString("fa-IR")}</span></div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-right text-[12px] border-collapse border border-neutral-300">
            <thead>
              <tr className="bg-neutral-200 text-neutral-800 font-bold border-b border-neutral-400">
                <th className="border border-neutral-300 px-2 py-2 text-center w-12">ردیف</th>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`border border-neutral-300 px-3 py-2 ${
                      col.align === "center" ? "text-center" : col.align === "left" ? "text-left" : "text-right"
                    }`}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-neutral-50" : "bg-white"}>
                  <td className="border border-neutral-300 px-2 py-1.5 text-center font-mono font-medium text-neutral-600">
                    {(i + 1).toLocaleString("fa-IR")}
                  </td>
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={`border border-neutral-300 px-3 py-1.5 ${
                        col.align === "center" ? "text-center" : col.align === "left" ? "text-left" : "text-right"
                      }`}
                    >
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="py-8 text-center text-neutral-500">
                    موردی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="mt-8 pt-4 flex justify-between text-[11.5px] text-neutral-600 border-t border-neutral-200">
            <div>تنظیم کننده: سیستم اتوماسیون توانمند</div>
            <div>امضا و تایید مدیریت فنی / سرویس</div>
          </div>
        </div>
      </div>
    </div>
  );
}
