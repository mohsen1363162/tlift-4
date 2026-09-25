import { useState, useMemo } from "react";
import {
  Search,
  RotateCcw,
  SlidersHorizontal,
  Printer,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Building2,
} from "lucide-react";
import { ZoneItem, appStore, useZones } from "../store";
import { Theme } from "../theme";

interface ZonesPageProps {
  t: Theme;
  onShowToast?: (msg: string) => void;
}

export default function ZonesPage({ t, onShowToast }: ZonesPageProps) {
  const zones = useZones();

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Active 3-dots dropdown menu
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Modal for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneItem | null>(null);

  // Form states
  const [formProvince, setFormProvince] = useState("قزوین");
  const [formCity, setFormCity] = useState("قزوین");
  const [formName, setFormName] = useState("");

  // Delete Confirmation Modal
  const [deletingZone, setDeletingZone] = useState<ZoneItem | null>(null);

  // Filtered Zones based on search
  const filteredZones = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 1) {
      return zones;
    }
    const q = searchQuery.trim().toLowerCase();
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.city.toLowerCase().includes(q) ||
        z.province.toLowerCase().includes(q)
    );
  }, [zones, searchQuery]);

  // Pagination calculation
  const totalItems = filteredZones.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedZones = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredZones.slice(start, start + pageSize);
  }, [filteredZones, currentPage, pageSize]);

  // Open modal for new zone
  const handleOpenAddModal = () => {
    setEditingZone(null);
    setFormProvince("قزوین");
    setFormCity("قزوین");
    setFormName("");
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  // Open modal for editing zone
  const handleOpenEditModal = (zone: ZoneItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingZone(zone);
    setFormProvince(zone.province || "قزوین");
    setFormCity(zone.city || "قزوین");
    setFormName(zone.name);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  // Save (Add or Update)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowToast?.("لطفاً نام منطقه را وارد نمایید.");
      return;
    }

    if (editingZone) {
      appStore.updateZone(editingZone.id, {
        name: formName.trim(),
        city: formCity.trim(),
        province: formProvince.trim(),
      });
      onShowToast?.(`منطقه «${formName.trim()}» با موفقیت ویرایش شد.`);
    } else {
      appStore.addZone({
        name: formName.trim(),
        city: formCity.trim(),
        province: formProvince.trim(),
      });
      onShowToast?.(`منطقه جدید «${formName.trim()}» با موفقیت اضافه شد.`);
    }

    setIsModalOpen(false);
    setEditingZone(null);
  };

  // Delete Zone
  const handleConfirmDelete = () => {
    if (!deletingZone) return;
    appStore.deleteZone(deletingZone.id);
    onShowToast?.(`منطقه «${deletingZone.name}» با موفقیت حذف شد.`);
    setDeletingZone(null);
    setActiveMenuId(null);
  };

  // Reset to default 38 zones
  const handleResetToDefault = () => {
    appStore.resetZonesToDefault();
    onShowToast?.("لیست منطقه‌ها به ۳۸ منطقه پیش‌فرض بازنشانی شد.");
  };

  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden text-right select-none ${t.body}`}
      dir="rtl"
      onClick={() => setActiveMenuId(null)}
    >
      {/* Top Toolbar (Matching sshot-50.png) */}
      <div
        className={`flex items-center justify-between border-b px-4 py-2.5 ${t.chrome} ${t.border} shadow-sm`}
      >
        {/* Right side: Search & Utility Icons */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div
            className={`flex h-8 w-64 items-center gap-2 rounded border px-2.5 text-[12px] ${t.input}`}
          >
            <Search size={14} className={t.sub} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجو خودکار با بیش از 2 کاراکتر"
              className="w-full bg-transparent text-[11.5px] outline-none placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Settings Icon */}
          <button
            type="button"
            title="تنظیمات نمایش"
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition"
          >
            <SlidersHorizontal size={14} />
          </button>

          {/* Refresh / Reset Icon */}
          <button
            type="button"
            onClick={handleResetToDefault}
            title="بازنشانی ۳۸ منطقه اصلی"
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition"
          >
            <RotateCcw size={14} />
          </button>

          {/* Export / Print Icon */}
          <button
            type="button"
            onClick={() => {
              window.print();
              onShowToast?.("در حال آماده‌سازی نسخه چاپی منطقه‌ها...");
            }}
            title="چاپ یا خروجی PDF"
            className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition"
          >
            <Printer size={14} />
          </button>
        </div>

        {/* Left side: Add Region Button (Purple / Rounded as in sshot-50.png) */}
        <div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 rounded-md bg-[#846b96] hover:bg-[#977ca9] px-4 py-1.5 text-[12px] font-bold text-white shadow-md transition-all active:scale-95"
          >
            <span>اضافه کردن منطقه</span>
          </button>
        </div>
      </div>

      {/* Main Table View (Matching sshot-50.png & sshot-51.png) */}
      <div className="flex-1 overflow-auto bg-[#1c1d21]/60">
        <table className="w-full border-collapse text-[12px] text-right">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-zinc-800 bg-[#25272c] text-[12px] font-bold text-zinc-400">
              <th className="w-16 py-3 pr-4 pl-2 text-center">ردیف</th>
              <th className="w-40 py-3 px-4">استان</th>
              <th className="w-40 py-3 px-4">شهر</th>
              <th className="py-3 px-4">منطقه</th>
              <th className="w-16 py-3 pl-4 pr-2 text-left"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
            {paginatedZones.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-500 text-[13px]">
                  موردی با این مشخصات یافت نشد.
                </td>
              </tr>
            ) : (
              paginatedZones.map((zone, idx) => {
                const rowNum = (currentPage - 1) * pageSize + idx + 1;
                const isMenuOpen = activeMenuId === zone.id;

                return (
                  <tr
                    key={zone.id}
                    className="group transition-colors hover:bg-zinc-800/40"
                  >
                    {/* Row Index */}
                    <td className="py-3 pr-4 pl-2 text-center font-mono text-zinc-400">
                      {rowNum}
                    </td>

                    {/* Province */}
                    <td className="py-3 px-4 text-zinc-300">
                      {zone.province || "قزوین"}
                    </td>

                    {/* City */}
                    <td className="py-3 px-4 text-zinc-300">
                      {zone.city || "قزوین"}
                    </td>

                    {/* Zone Name */}
                    <td className="py-3 px-4 font-semibold text-zinc-100">
                      {zone.name}
                    </td>

                    {/* 3-dots Context Menu Button (Leftmost in RTL, matching sshot-52.png) */}
                    <td className="relative py-3 pl-4 pr-2 text-left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId((curr) => (curr === zone.id ? null : zone.id));
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 transition"
                        title="عملیات"
                      >
                        <MoreVertical size={15} />
                      </button>

                      {/* 3-Dots Dropdown Menu (sshot-52.png) */}
                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-4 top-10 z-50 w-32 rounded-lg border border-zinc-700 bg-[#222428] py-1 text-[11.5px] text-zinc-200 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(zone, e)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-right hover:bg-zinc-700/80 transition text-zinc-200"
                          >
                            <Edit2 size={13} className="text-amber-400 shrink-0" />
                            <span>ویرایش</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              setDeletingZone(zone);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-right hover:bg-red-500/20 transition text-red-400"
                          >
                            <Trash2 size={13} className="text-red-400 shrink-0" />
                            <span>حذف</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Bar: Total count & Pagination (Matching sshot-50.png) */}
      <div
        className={`flex items-center justify-between border-t px-4 py-2 text-[12px] ${t.chrome} ${t.border}`}
      >
        {/* Right side: Items found count */}
        <div className="text-zinc-400 font-medium">
          <span className="font-bold text-zinc-200">{totalItems}</span> مورد پیدا شد
        </div>

        {/* Left side: Pagination Controls */}
        <div className="flex items-center gap-3">
          {/* Page size dropdown */}
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`h-7 rounded border px-2 text-[11.5px] outline-none ${t.input} cursor-pointer`}
            >
              <option value={20}>20 / صفحه</option>
              <option value={50}>50 / صفحه</option>
              <option value={100}>100 / صفحه</option>
              <option value={1000}>همه</option>
            </select>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            {/* Prev button */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={14} />
            </button>

            {/* Page number buttons */}
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              const isActive = page === currentPage;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-7 w-7 items-center justify-center rounded border text-[11.5px] font-bold transition ${
                    isActive
                      ? "border-[#846b96] bg-[#846b96] text-white"
                      : "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            {/* Next button */}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Add or Edit Region (Matching sshot-53.png) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-zinc-700 bg-[#1e2024] p-6 text-right text-zinc-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#846b96]/20 text-[#c2a4d7] border border-[#846b96]/40">
                  <MapPin size={16} />
                </div>
                <h3 className="font-bold text-[14px]">
                  {editingZone ? "ویرایش مشخصات منطقه" : "اضافه کردن منطقه جدید"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Fields: Row of Province, City, Zone name (Matching sshot-53.png) */}
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6 text-[12px]">
                {/* 1. Province (استان) */}
                <div>
                  <label className="block text-[11.5px] text-zinc-300 mb-1.5">
                    <span className="text-red-400 ml-0.5">*</span> استان
                  </label>
                  <select
                    value={formProvince}
                    onChange={(e) => setFormProvince(e.target.value)}
                    className={`w-full rounded-lg border p-2.5 text-[12px] outline-none ${t.input} cursor-pointer`}
                  >
                    <option value="قزوین">قزوین</option>
                    <option value="تهران">تهران</option>
                    <option value="البرز">البرز</option>
                    <option value="گیلان">گیلان</option>
                    <option value="زنجان">زنجان</option>
                    <option value="همدان">همدان</option>
                  </select>
                </div>

                {/* 2. City (شهر) */}
                <div>
                  <label className="block text-[11.5px] text-zinc-300 mb-1.5">
                    <span className="text-red-400 ml-0.5">*</span> شهر
                  </label>
                  <select
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className={`w-full rounded-lg border p-2.5 text-[12px] outline-none ${t.input} cursor-pointer`}
                  >
                    <option value="قزوین">قزوین</option>
                    <option value="الوند">الوند</option>
                    <option value="محمدیه (زیباشهر)">محمدیه (زیباشهر)</option>
                    <option value="مهرگان">مهرگان</option>
                    <option value="تاکستان">تاکستان</option>
                    <option value="بوئین زهرا">بوئین زهرا</option>
                    <option value="آبیک">آبیک</option>
                    <option value="محمودآباد">محمودآباد</option>
                  </select>
                </div>

                {/* 3. Zone Name (منطقه) */}
                <div>
                  <label className="block text-[11.5px] text-zinc-300 mb-1.5">
                    <span className="text-red-400 ml-0.5">*</span> منطقه
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: عارف خرم، پونک، ملاصدرا..."
                    className={`w-full rounded-lg border p-2.5 text-[12px] outline-none ${t.input}`}
                    autoFocus
                  />
                </div>
              </div>

              {/* Submit Button (Purple rounded 'ثبت' as in sshot-53.png) */}
              <div className="flex items-center justify-start gap-2 border-t border-zinc-800/80 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-[#846b96] hover:bg-[#977ca9] px-6 py-2 text-[12.5px] font-bold text-white shadow-md transition active:scale-95"
                >
                  <Check size={15} />
                  <span>ثبت</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-[12px] text-zinc-300 hover:bg-zinc-800"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingZone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setDeletingZone(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-zinc-700 bg-[#1e2024] p-5 text-right text-zinc-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3 text-red-400">
              <Trash2 size={18} />
              <h3 className="font-bold text-[14px]">حذف منطقه</h3>
            </div>
            <p className="text-[12px] text-zinc-300 leading-6 mb-5">
              آیا از حذف منطقه «<span className="font-bold text-white">{deletingZone.name}</span>» اطمینان دارید؟
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingZone(null)}
                className="rounded-lg border border-zinc-700 px-4 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-800"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-1.5 text-[12px] font-bold text-white shadow"
              >
                حذف قطعی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
