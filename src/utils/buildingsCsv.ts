export type BuildingCsvRow = {
  contractNo: string;
  customerName: string;
  buildingName: string;
  startDate: string;
  endDate: string;
  serviceFee: number;
};

const toEnglishDigits = (value: string) => value
  .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const normalize = (value: string) => value.trim().replace(/^"|"$/g, "");
const numberValue = (value: string) => Number(toEnglishDigits(value).replace(/[^\d]/g, "")) || 0;

export function parseBuildingsCsv(text: string): BuildingCsvRow[] {
  if (!text.trim()) return [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map(normalize).filter(Boolean);
  const dataLines = lines.filter(line => !/شماره\s*قرارداد|هزینه\s*سرویس/.test(line));

  return dataLines.map((line) => {
    const cells = line.split(/[;\t]/).map(normalize).filter(Boolean);
    // فایل دو ستونی کاربر ممکن است در بعضی نرم‌افزارها یک ستون دیده شود:
    // اولین عدد شماره قرارداد و باقی ارقام همان سطر مبلغ دوره هستند.
    if (cells.length < 2) {
      const normalized = toEnglishDigits(line);
      const contractMatch = normalized.match(/\d+/);
      if (!contractMatch) return null;
      const contractNo = contractMatch[0];
      const remainder = normalized.slice((contractMatch.index || 0) + contractNo.length);
      return { contractNo, customerName: "", buildingName: "", startDate: "", endDate: "", serviceFee: numberValue(remainder) };
    }
    return { contractNo: numberValue(cells[0]).toString(), customerName: cells[2] || "", buildingName: cells[3] || "", startDate: cells[4] || "", endDate: cells[5] || "", serviceFee: numberValue(cells[1]) };
  }).filter((row): row is BuildingCsvRow => Boolean(row?.contractNo && row.serviceFee >= 0));
}
