import { useState } from "react";
import { ShieldCheck, MapPin, Plus, Trash2, Save, Crown } from "lucide-react";
import type { Theme } from "../theme";
import { appStore, CompanyLeader, useCompanyAccessSettings } from "../store";

export default function AccessManagementPage({ t }: { t: Theme }) {
  const settings = useCompanyAccessSettings();
  const [draft, setDraft] = useState(settings);
  const addLeader = () => setDraft((s) => ({ ...s, leaders: [...s.leaders, { id: `leader-${Date.now()}`, name: "", phone: "", title: "مدیرعامل", canManageContracts: true, canManageFinancials: false, canAccessSettings: true }] }));
  const update = (id: string, patch: Partial<CompanyLeader>) => setDraft((s) => ({ ...s, leaders: s.leaders.map((x) => x.id === id ? { ...x, ...patch } : x) }));
  const save = () => { appStore.updateCompanyAccessSettings(draft); };
  return <div className={`h-full overflow-y-auto p-5 ${t.text}`} dir="rtl">
    <div className="mb-5 flex items-center justify-between"><div><h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="text-emerald-500" /> مدیریت مدیران و سطح دسترسی</h1><p className={`mt-1 text-xs ${t.sub}`}>تعریف مدیرعامل، رئیس شرکت و سیاست‌های امنیتی سامانه</p></div><button onClick={save} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white"><Save size={16}/> ذخیره تنظیمات</button></div>

    <section className={`rounded-2xl border p-4 ${t.panel} ${t.border}`}>
      <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Crown className="text-amber-500" size={18}/> مدیرعامل و مدیران مجاز</h2><button onClick={addLeader} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Plus size={14}/> افزودن مدیر</button></div>
      <div className="space-y-3">{draft.leaders.map((leader) => <div key={leader.id} className={`rounded-xl border p-3 ${t.border}`}>
        <div className="grid gap-2 md:grid-cols-4"><input value={leader.name} onChange={e=>update(leader.id,{name:e.target.value})} placeholder="نام و نام خانوادگی" className={`rounded-lg border p-2 text-xs ${t.input}`}/><input value={leader.phone} onChange={e=>update(leader.id,{phone:e.target.value})} placeholder="شماره همراه" dir="ltr" className={`rounded-lg border p-2 text-xs ${t.input}`}/><select value={leader.title} onChange={e=>update(leader.id,{title:e.target.value as CompanyLeader["title"]})} className={`rounded-lg border p-2 text-xs ${t.input}`}><option>مدیرعامل</option><option>رئیس شرکت</option><option>مدیر</option></select><button onClick={()=>setDraft(s=>({...s,leaders:s.leaders.filter(x=>x.id!==leader.id)}))} className="flex items-center justify-center gap-1 rounded-lg border border-rose-300 text-xs text-rose-500"><Trash2 size={14}/> حذف</button></div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">{[["canManageContracts","افزودن، ویرایش و حذف قرارداد"],["canManageFinancials","تغییر مبالغ و اطلاعات مالی"],["canAccessSettings","دسترسی به تنظیمات اولیه"]].map(([key,label])=><label key={key} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(leader[key as keyof CompanyLeader])} onChange={e=>update(leader.id,{[key]:e.target.checked})}/>{label}</label>)}</div>
      </div>)}{draft.leaders.length===0&&<div className={`py-8 text-center text-xs ${t.sub}`}>هنوز مدیری تعریف نشده است</div>}</div>
    </section>

    <section className={`mt-4 rounded-2xl border p-4 ${t.panel} ${t.border}`}><h2 className="flex items-center gap-2 font-bold"><MapPin className="text-blue-500" size={18}/> سیاست کنترل GPS سرویس‌ها</h2><div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-blue-500/10 p-4"><div><b className="text-sm">الزام حضور در محل برای شروع سرویس</b><p className={`mt-1 text-xs ${t.sub}`}>در خرابی GPS می‌توانید موقتاً خاموش کنید و بعداً دوباره فعال نمایید.</p></div><button onClick={()=>setDraft(s=>({...s,gpsRequired:!s.gpsRequired}))} className={`rounded-full px-5 py-2 text-xs font-bold text-white ${draft.gpsRequired?"bg-emerald-600":"bg-gray-500"}`}>{draft.gpsRequired?"GPS فعال است":"GPS غیرفعال است"}</button></div><label className="mt-4 block text-xs">شعاع مجاز شروع سرویس (متر)<input type="number" min={50} max={2000} value={draft.gpsRadiusMeters} onChange={e=>setDraft(s=>({...s,gpsRadiusMeters:Math.max(50,Number(e.target.value)||300)}))} className={`mt-1 block w-48 rounded-lg border p-2 ${t.input}`}/></label></section>

    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-500/10 p-4 text-xs leading-6"><b>قانون نقش‌ها:</b> مدیر اصلی به کل سامانه دسترسی دارد. مدیران تعریف‌شده فقط مجوزهای انتخاب‌شده را می‌گیرند. سرویس‌کار فقط اپ سرویس و مشتری فقط ساختمان، پرداخت‌ها و گزارش‌های مربوط به خود را مشاهده می‌کند.</div>
  </div>;
}
