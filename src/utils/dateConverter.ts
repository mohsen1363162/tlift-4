
// Persian date conversion functions
export function gregorianToJalali(gy: number, gm: number, gd: number) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  
  let jm, jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number) {
  jy += 1595;
  let days = -355668 + (365 * jy) + Math.floor(jy / 33) * 8 + 
    Math.floor(((jy % 33) + 3) / 4) + jd + 
    ((jm < 7) ? ((jm - 1) * 31) : (((jm - 7) * 30) + 186));
    
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
  let gm;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  
  return [gy, gm, gd];
}

export function isLeapJalali(jy: number) {
  const breaks = [ -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm;
  let jump = 0;
  let leap;
  let i;
  
  if (jy < jp || jy >= breaks[bl-1]) 
    throw new Error("Invalid Jalali year " + jy);
  
  for(i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if(jy < jm)
      break;
    leapJ = leapJ + Math.floor(jump/33)*8 + Math.floor((jump%33)/4);
    jp = jm;
  }
  
  const n = jy - jp;
  leapJ = leapJ + Math.floor(n/33)*8 + Math.floor(((n%33)+3)/4);
  if(((jump%33) === 4) && (jump-n === 4))
    leapJ += 1;
  
  leap = (((leapJ + 1) % 33) - 1) % 4;
  if (leap === -1) leap = 4;
  
  return leap === 0;
}

export const shamsiMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

export function getTodayJalali() {
  const today = new Date();
  const [jy, jm, jd] = gregorianToJalali(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  return { jy, jm, jd };
}

export function getShamsiDaysInMonth(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalali(jy) ? 30 : 29;
}

export function getShamsiFirstDayOfWeek(jy: number, jm: number) {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
  const date = new Date(gy, gm - 1, gd);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  return (dayOfWeek + 1) % 7; // Convert so 0 is Saturday (first day in Persian week)
}

export function formatJalaliDate(jy: number, jm: number, jd: number) {
  return `${jd} ${shamsiMonths[jm-1]} ${jy}`;
}

export function parseJalaliDate(dateStr: string) {
  const parts = dateStr.split(' ');
  if (parts.length !== 3) {
    return null;
  }
  
  const jd = parseInt(parts[0]);
  const jmIndex = shamsiMonths.findIndex(m => m === parts[1]);
  const jy = parseInt(parts[2]);
  
  if (isNaN(jd) || jmIndex === -1 || isNaN(jy)) {
    return null;
  }
  
  return { jy, jm: jmIndex + 1, jd };
}
