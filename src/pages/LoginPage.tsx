import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  findUserByPhone,
  toEnglishDigits,
  cleanIranianPhone,
} from '@/utils/customerAuth';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Smartphone,
  User,
  Wrench,
  X,
} from 'lucide-react';

const REMEMBER_KEY = 'tlift_remembered_phone';

interface LoginError {
  code: string;
  title: string;
  message: string;
}

const LoginPage: React.FC = () => {
  const { loginAsCustomer, signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<LoginError | null>(null);

  // حالت ورود ادمین با رمز عبور (در صورت نیاز مدیر سیستم)
  const [adminMode, setAdminMode] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // پیش‌بارگذاری شماره ذخیره‌شده
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) setPhone(saved);
  }, []);

  const persistRemember = () => {
    if (remember && phone.trim()) {
      localStorage.setItem(REMEMBER_KEY, phone.trim());
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  };

  /* ---------- فرآیند ورود ---------- */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);
    const rawInput = phone.trim();

    // بررسی خالی بودن شماره
    if (!rawInput) {
      const err: LoginError = {
        code: 'ERR-400-EMPTY',
        title: 'شماره موبایل الزامی است',
        message: 'لطفاً شماره موبایل خود را در کادر زیر وارد نمایید.',
      };
      setErrorState(err);
      toast({
        title: `خطا (${err.code})`,
        description: err.message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // اگر حالت ورود با رمز فعال باشد یا کاربر ایمیل تایپ کرده باشد
      if (adminMode || rawInput.includes('@')) {
        if (!password) {
          const err: LoginError = {
            code: 'ERR-400-PASSWORD',
            title: 'کلمه عبور الزامی است',
            message: 'لطفاً کلمه عبور حساب مدیریتی را وارد کنید.',
          };
          setErrorState(err);
          toast({
            title: `خطا (${err.code})`,
            description: err.message,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { error } = await signIn(rawInput, password);
        if (error) {
          const err: LoginError = {
            code: 'ERR-401-INVALID-CREDENTIALS',
            title: 'ورود ناموفق',
            message: 'نام کاربری یا کلمه عبور وارد شده اشتباه است.',
          };
          setErrorState(err);
          toast({
            title: `خطا (${err.code})`,
            description: err.message,
            variant: 'destructive',
          });
        } else {
          persistRemember();
          toast({
            title: 'خوش آمدید',
            description: 'ورود به سامانه آسمان‌سرا با موفقیت انجام شد.',
          });
        }
        setLoading(false);
        return;
      }

      // ۱. بررسی فرمت شماره تلفن
      const cleaned = cleanIranianPhone(rawInput);
      if (cleaned.length < 10 || cleaned.length > 11) {
        const err: LoginError = {
          code: 'ERR-422-INVALID-FORMAT',
          title: 'فرمت شماره نامعتبر است',
          message:
            'شماره موبایل وارد شده نامعتبر است. شماره باید ۱۱ رقمی باشد (مانند ۰۹۱۹۲۸۶۸۵۰۹ یا ۰۹۱۲۶۸۱۷۸۸۴).',
        };
        setErrorState(err);
        toast({
          title: `کد خطا: ${err.code}`,
          description: err.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // ۲. جستجوی کاربر در سیستم (تکنسین‌های سرویس، مدیر، یا مشتریان طرف قرارداد)
      const matchedUser = await findUserByPhone(cleaned);

      if (!matchedUser) {
        const err: LoginError = {
          code: 'ERR-403-NOT-FOUND',
          title: 'دسترسی غیرمجاز - شماره ثبت نشده',
          message:
            'شماره موبایل وارد شده در لیست مشتریان، طرف‌های قرارداد یا تکنسین‌های سرویس شرکت آسمان‌سرا یافت نشد. لطفاً با شماره پشتیبانی شرکت تماس بگیرید.',
        };
        setErrorState(err);
        toast({
          title: `کد خطا: ${err.code}`,
          description: err.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // ۳. ورود موفقیت‌آمیز کاربر (مشتری، سرویس‌کار، یا مدیر)
      sessionStorage.setItem('tlift_show_welcome', 'true');
      persistRemember();
      loginAsCustomer(matchedUser);

      const isTech = matchedUser.role === 'technician';
      const isAdmin = matchedUser.role === 'admin';

      toast({
        title: `خوش آمدید، ${matchedUser.name} عزیز`,
        description: isTech
          ? 'ورود موفق به عنوان تکنسین سرویس و مسئول انجام آسانسور.'
          : isAdmin
          ? 'ورود موفقیت‌آمیز با دسترسی مدیریت ارشد سیستم.'
          : `ورود موفق به عنوان ${matchedUser.userType || 'مشتری سامانه'}.`,
      });
    } catch (err) {
      console.error('Login error', err);
      const systemErr: LoginError = {
        code: 'ERR-500-INTERNAL',
        title: 'خطای سیستمی',
        message: 'مشکلی در پردازش اطلاعات رخ داد. لطفاً مجدداً امتحان کنید.',
      };
      setErrorState(systemErr);
      toast({
        title: `خطا (${systemErr.code})`,
        description: systemErr.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] p-4" dir="rtl">
      <div className="relative w-full max-w-[350px] rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.10)] ring-1 ring-black/[0.04]">
        {/* دکمه بستن پنجره */}
        <button
          type="button"
          onClick={() => window.close()}
          title="بستن"
          className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#eef0f4] text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
        >
          <X size={13} strokeWidth={2.5} />
        </button>

        {/* سربرگ: نشان قرمز شرکت آسمان‌سرا + عنوان فرم ورود */}
        <div className="mb-5 flex items-center gap-3 pl-7">
          <BrandLogo className="h-11 w-11 shadow-sm" />
          <div>
            <h1 className="text-[15px] font-bold leading-6 text-gray-800">
              فرم ورود شرکت آسمان‌سرا
            </h1>
            <p className="mt-0.5 text-[11px] text-[#8d7fc9] font-medium flex items-center gap-1">
              <span>ورود مشتریان و تکنسین‌های سرویس</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          {/* کادر نمایش خطا و کد خطا به‌صورت برجسته */}
          {errorState && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50/95 p-3 text-right text-[12px] text-red-800 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <div className="flex items-center justify-between border-b border-red-200/70 pb-1.5 mb-1.5">
                <span className="flex items-center gap-1.5 font-bold text-red-900 text-[12.5px]">
                  <AlertCircle size={15} className="text-red-600 shrink-0" />
                  {errorState.title}
                </span>
                <span
                  dir="ltr"
                  className="rounded bg-red-600 px-2 py-0.5 font-mono text-[10.5px] font-bold text-white shadow-xs tracking-wider"
                >
                  {errorState.code}
                </span>
              </div>
              <p className="leading-5 text-red-700 text-[11.5px]">{errorState.message}</p>
            </div>
          )}

          {/* فیلد شماره موبایل */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-600">
              {adminMode ? 'شماره موبایل یا ایمیل مدیر' : 'شماره موبایل مشتری یا تکنسین'}
            </label>
            <div className="relative">
              <Input
                value={phone}
                onChange={(e) => {
                  setPhone(toEnglishDigits(e.target.value));
                  if (errorState) setErrorState(null);
                }}
                placeholder="09192868509"
                inputMode={adminMode ? 'text' : 'tel'}
                autoComplete="tel"
                autoFocus
                dir="ltr"
                className={`h-10 rounded-lg bg-[#fafbfc] pr-9 pl-3 text-left text-[13px] text-gray-800 shadow-none placeholder:text-gray-400 focus-visible:ring-1 ${
                  errorState
                    ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-400'
                    : 'border-gray-200 focus-visible:border-[#8d7fc9] focus-visible:ring-[#8d7fc9]'
                }`}
              />
              <User
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {/* فیلد کلمه عبور (تنها در حالت ورود مدیر با رمز) */}
          {adminMode && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="mb-1 block text-[11px] font-medium text-gray-600">
                کلمه عبور
              </label>
              <div className="relative">
                <Input
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorState) setErrorState(null);
                  }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="کلمه عبور"
                  autoComplete="current-password"
                  className="h-10 rounded-lg border-gray-200 bg-[#fafbfc] pr-9 pl-10 text-[13px] text-gray-800 shadow-none placeholder:text-gray-400 focus-visible:border-[#8d7fc9] focus-visible:ring-1 focus-visible:ring-[#8d7fc9]"
                />
                <Lock
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? 'پنهان کردن کلمه عبور' : 'نمایش کلمه عبور'}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* به خاطر بسپار / ورود با رمز */}
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <button
              type="button"
              onClick={() => setRemember((v) => !v)}
              className="flex items-center gap-1.5 text-gray-600 transition hover:text-gray-800"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                  remember
                    ? 'border-[#8d7fc9] bg-[#8d7fc9] text-white'
                    : 'border-gray-300 bg-white text-transparent'
                }`}
              >
                <Check size={11} strokeWidth={3.5} />
              </span>
              شماره من را به خاطر بسپار
            </button>

            {/* سوییچ حالت ورود مدیر */}
            <button
              type="button"
              onClick={() => {
                setAdminMode((v) => !v);
                setErrorState(null);
              }}
              className="text-[10.5px] text-gray-400 transition hover:text-[#8d7fc9] flex items-center gap-1"
            >
              <KeyRound size={11} />
              {adminMode ? 'ورود عادی' : 'ورود با رمز'}
            </button>
          </div>

          {/* دکمه اصلی ورود به سیستم */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-lg bg-[#8d7fc9] text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#7c6db8] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  ورود به سیستم
                  <ArrowLeft size={16} className="-mr-0.5" />
                </>
              )}
            </Button>
          </div>

          {/* راهنمای کوتاه در پایین کادر */}
          <div className="pt-1 text-center">
            <span className="text-[10.5px] text-gray-400 inline-flex items-center justify-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Smartphone size={11} className="text-[#8d7fc9]" />
                مشتریان طرف قرارداد
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Wrench size={11} className="text-emerald-500" />
                تکنسین‌های سرویس و نگهداری
              </span>
            </span>
          </div>
        </form>
      </div>

      <Toaster />
    </div>
  );
};

export default LoginPage;
