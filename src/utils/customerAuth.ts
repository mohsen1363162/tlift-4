import { appStore } from '@/store';
import { initialStaff, Staff } from '@/data';
import {
  parseCustomersCsv,
  parseContractsCsv,
  RAW_CUSTOMERS_CSV_DATA,
  RAW_CSV_DATA,
} from '@/csvData';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerAuthData {
  id: string;
  name: string;
  phone?: string;
  role: 'customer' | 'admin' | 'staff' | 'operator' | 'technician';
  userType?: string;
  buildings?: number;
  subscriptionNo?: string;
  avatar?: string;
  color?: string;
  activity?: string;
}

export const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const toEnglishDigits = (value: string = ''): string => {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
};

/** تمیز کردن شماره تلفن ایرانی به فرمت ۱۰ رقمی (بدون صفر اول و بدون پیش‌شماره کشور) */
export const cleanIranianPhone = (input: string = ''): string => {
  let digits = toEnglishDigits(input).replace(/\D/g, '');
  if (digits.startsWith('0098')) digits = digits.slice(4);
  else if (digits.startsWith('98')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
};

/** فرمت استاندارد نمایش شماره موبایل: 09192868509 */
export const formatDisplayPhone = (raw: string = ''): string => {
  const cleaned = cleanIranianPhone(raw);
  if (cleaned.length === 10) return `0${cleaned}`;
  return raw;
};

/**
 * جستجوی کاربر در سیستم (سرویس‌کاران، مدیر و مشتریان) بر اساس شماره موبایل
 * اولویت‌ها:
 * ۱. تکنسین‌های سرویس و مدیر (از بخش «سرویس‌کار و مسئول انجام» شامل مجتبی فرهمند، میثم سهرابی، بهمن کشاورز، رحیمی‌زاده، قاسمعلی و امامی)
 * ۲. تکنسین‌های ذخیره شده در localStorage یا Supabase
 * ۳. مشتریان فعال در سیستم و پایگاه داده
 * ۴. طرف‌های قرارداد و مسئولین هماهنگی ساختمان
 * ۵. پشتیبان‌های CSV مشتریان و قراردادها
 */
export async function findUserByPhone(inputPhone: string): Promise<CustomerAuthData | null> {
  const cleaned = cleanIranianPhone(inputPhone);
  if (!cleaned || cleaned.length < 10) return null;

  // مالک سامانه همیشه پیش از جست‌وجوی مشتری و قرارداد به‌عنوان مدیر/تکنسین شناسایی می‌شود.
  // ممکن است همین شماره به‌عنوان تماس یک قرارداد نیز ثبت شده باشد؛ آن رکورد نباید نقش مدیر را تغییر دهد.
  if (cleaned === cleanIranianPhone('09192868509')) {
    return {
      id: 'system_admin_mohsen_emami',
      name: 'محسن امامی برسری',
      phone: '09192868509',
      role: 'admin',
      userType: 'مدیر شرکت و تکنسین سرویس',
      activity: 'مدیریت شرکت و سرویس آسانسور',
    };
  }

  // مدیرعامل/رئیس شرکت تعریف‌شده در تنظیمات دسترسی
  try {
    const access = JSON.parse(localStorage.getItem('tlift_company_access_settings_v1') || '{"leaders":[]}');
    const leader = (access.leaders || []).find((item: { phone?: string }) => cleanIranianPhone(item.phone || '') === cleaned);
    if (leader) return { id: leader.id, name: leader.name, phone: formatDisplayPhone(leader.phone), role: 'operator', userType: leader.title, activity: 'مدیریت شرکت' };
  } catch { /* تنظیمات هنوز ثبت نشده است */ }

  // ۱. بررسی بخش پرسنل، سرویس‌کاران و مدیر (قسمت «سرویس‌کار و مسئول انجام»)
  let staffList: Staff[] = [];
  try {
    staffList = appStore.getStaff() || [];
  } catch (err) {
    console.warn('Error reading staff from store', err);
  }

  // اگر لیست استور خالی بود، از لیست پیش‌فرض اولیه استفاده می‌کنیم
  if (!staffList.length) {
    staffList = initialStaff;
  }

  for (const s of staffList) {
    if (s.phone && cleanIranianPhone(s.phone) === cleaned) {
      const isMohsen =
        s.phone.includes('09192868509') ||
        (s.first === 'محسن' && s.last.includes('امامی'));

      if (isMohsen) {
        return {
          id: `staff_${s.id || s.phone}`,
          name: `${s.first} ${s.last}`.trim(),
          phone: formatDisplayPhone(s.phone),
          role: 'admin',
          userType: 'مدیر ارشد سامانه آسمان‌سرا',
          avatar: s.avatar,
          color: s.color,
          activity: 'مدیریت و پشتیبانی',
        };
      }

      // سایر سرویس‌کاران و تکنسین‌های مجاز (میثم سهرابی، بهمن کشاورز، مجتبی فرهمند، رحیمی‌زاده، قاسمعلی، ...)
      return {
        id: `tech_${s.id || s.phone}`,
        name: `${s.first} ${s.last}`.trim(),
        phone: formatDisplayPhone(s.phone),
        role: 'technician',
        userType: 'تکنسین سرویس آسانسور',
        avatar: s.avatar,
        color: s.color,
        activity: s.activity || 'سرویس و نگهداری آسانسور',
      };
    }
  }

  // ۲. بررسی لیست تکنسین‌های ذخیره‌شده در localStorage (کلید technicians)
  try {
    const rawTechs = localStorage.getItem('technicians');
    if (rawTechs) {
      const parsedTechs = JSON.parse(rawTechs) as Array<{ id: string; name: string; phone?: string; color?: string }>;
      for (const t of parsedTechs) {
        if (t.phone && cleanIranianPhone(t.phone) === cleaned) {
          return {
            id: `tech_saved_${t.id}`,
            name: t.name,
            phone: formatDisplayPhone(t.phone),
            role: 'technician',
            userType: 'تکنسین سرویس آسانسور',
            color: t.color,
            activity: 'سرویس‌کار و مسئول انجام',
          };
        }
      }
    }
  } catch (err) {
    console.warn('Error reading saved technicians', err);
  }

  // ۳. بررسی جدول تکنسین‌ها در Supabase
  try {
    const { data: supaTechs } = await supabase
      .from('technicians')
      .select('*')
      .limit(50);
    if (supaTechs && supaTechs.length > 0) {
      for (const st of supaTechs) {
        if (st.phone && cleanIranianPhone(st.phone) === cleaned) {
          return {
            id: `supa_tech_${st.id}`,
            name: st.name,
            phone: formatDisplayPhone(st.phone),
            role: 'technician',
            userType: 'تکنسین سرویس آسانسور',
            color: st.color,
            activity: 'سرویس‌کار آسانسور',
          };
        }
      }
    }
  } catch {
    // عدم دسترسی به شبکه مانع عملکرد محلی نمی‌شود
  }

  // ۴. بررسی لیست مشتریان در استور
  try {
    const customers = appStore.getCustomers();
    for (const c of customers) {
      if (c.phone && cleanIranianPhone(c.phone) === cleaned) {
        return {
          id: `cust_${c.id || cleanIranianPhone(c.phone)}`,
          name: c.name.replace(/^\*\s*/, '').replace(/\s*\*$/, '').trim(),
          phone: formatDisplayPhone(c.phone),
          role: 'customer',
          userType: 'مشتری آسانسور',
          buildings: c.buildings,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading customers from store', err);
  }

  // ۵. بررسی قراردادهای فعال در استور (شماره مشتری یا هماهنگ‌کننده)
  try {
    const contracts = appStore.getContracts();
    for (const c of contracts) {
      if (
        (c.phone && cleanIranianPhone(c.phone) === cleaned) ||
        (c.coordinatorPhone && cleanIranianPhone(c.coordinatorPhone) === cleaned)
      ) {
        return {
          id: `contract_${c.id || c.no}`,
          name: (c.customer || c.coordinator || c.buildingName || 'مشتری گرامی')
            .replace(/^\*\s*/, '')
            .replace(/\s*\*$/, '')
            .trim(),
          phone: formatDisplayPhone(c.phone || c.coordinatorPhone || ''),
          role: 'customer',
          userType: 'مشتری دارای قرارداد',
          subscriptionNo: c.subscriptionNo,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading contracts from store', err);
  }

  // ۶. بررسی پشتیبان داده‌های خام مشتریان (CSV)
  try {
    const custRows = parseCustomersCsv(RAW_CUSTOMERS_CSV_DATA);
    for (const c of custRows) {
      if (c.phone && cleanIranianPhone(c.phone) === cleaned) {
        return {
          id: `csv_cust_${cleanIranianPhone(c.phone)}`,
          name: c.name.replace(/^\*\s*/, '').replace(/\s*\*$/, '').trim(),
          phone: formatDisplayPhone(c.phone),
          role: 'customer',
          userType: 'مشتری آسانسور',
          buildings: c.buildings,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading CSV customers', err);
  }

  // ۷. بررسی پشتیبان داده‌های خام قراردادها (CSV)
  try {
    const contractRows = parseContractsCsv(RAW_CSV_DATA);
    for (const c of contractRows) {
      if (
        (c.phone && cleanIranianPhone(c.phone) === cleaned) ||
        (c.coordinatorPhone && cleanIranianPhone(c.coordinatorPhone) === cleaned)
      ) {
        return {
          id: `csv_contract_${c.no}`,
          name: (c.customer || c.coordinator || c.buildingName || 'مشتری گرامی')
            .replace(/^\*\s*/, '')
            .replace(/\s*\*$/, '')
            .trim(),
          phone: formatDisplayPhone(c.phone || c.coordinatorPhone),
          role: 'customer',
          userType: 'مشتری دارای قرارداد',
          subscriptionNo: c.subscriptionNo,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading CSV contracts', err);
  }

  // ۸. بررسی جدول مشتریان در Supabase
  try {
    const { data: supaCustomers } = await supabase
      .from('customers')
      .select('*')
      .limit(100);
    if (supaCustomers && supaCustomers.length > 0) {
      for (const sc of supaCustomers) {
        if (sc.phone && cleanIranianPhone(sc.phone) === cleaned) {
          return {
            id: `supa_cust_${sc.id}`,
            name: (sc.customer_name || 'مشتری گرامی').trim(),
            phone: formatDisplayPhone(sc.phone),
            role: 'customer',
            userType: 'مشتری سامانه',
          };
        }
      }
    }
  } catch {
    // خطای شبکه مانع کارکرد بخش‌های محلی نمی‌شود
  }

  return null;
}
