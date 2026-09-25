import { X, Eye, EyeOff, Save, Check } from "lucide-react";
import type { Theme } from "../theme";

export type ColumnDef = {
  key: string;
  title: string;
  visible: boolean;
};

export default function ColumnSettingsDrawer({
  isOpen,
  onClose,
  columns,
  onToggleColumn,
  onSave,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDef[];
  onToggleColumn: (key: string) => void;
  onSave?: () => void;
  t: Theme;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer on the LEFT (as shown in screenshots 41 & 42) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r shadow-2xl transition-transform ${
          t.border
        } ${t.dark ? "bg-[#1d1d1d]" : "bg-white"} ${t.text}`}
      >
        {/* Drawer Header */}
        <div className={`flex items-center justify-between border-b px-4 py-3.5 ${t.border}`}>
          <button
            type="button"
            onClick={onClose}
            className={`rounded p-1 transition ${t.hover} ${t.sub}`}
          >
            <X size={17} />
          </button>
          <span className="text-[13.5px] font-bold">تنظیمات جدول</span>
        </div>

        {/* Column Items List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {columns.map((col) => (
            <button
              key={col.key}
              type="button"
              onClick={() => onToggleColumn(col.key)}
              className={`flex w-full items-center justify-between rounded px-3 py-2.5 text-[12.5px] transition ${
                col.visible
                  ? `${t.hover} ${t.text} font-medium`
                  : `opacity-50 hover:opacity-80 ${t.sub}`
              }`}
            >
              <div className="flex items-center gap-2">
                {col.visible ? (
                  <Eye size={17} className="text-violet-400" />
                ) : (
                  <EyeOff size={17} className="text-neutral-500" />
                )}
              </div>
              <span className="text-right">{col.title}</span>
            </button>
          ))}
        </div>

        {/* Drawer Footer */}
        <div className={`border-t p-3 ${t.border} ${t.dark ? "bg-[#181818]" : "bg-neutral-50"}`}>
          <button
            type="button"
            onClick={() => {
              onSave?.();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-4 py-2 text-[12.5px] font-medium text-neutral-100 shadow-sm transition"
          >
            <Save size={15} />
            <span>ذخیره و اعمال</span>
          </button>
        </div>
      </div>
    </>
  );
}
