export async function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T | string; title: string; render?: (item: T) => unknown }[],
  fileName = "گزارش"
) {
  if (!data || data.length === 0) {
    alert("داده‌ای برای خروجی اکسل وجود ندارد.");
    return;
  }

  // کتابخانهٔ سنگین xlsx فقط هنگام نیاز (کلیک روی خروجی اکسل) لود می‌شود
  const XLSX = await import("xlsx");

  const rows = data.map((item, index) => {
    const row: Record<string, unknown> = { ردیف: index + 1 };
    columns.forEach((col) => {
      if (col.render) {
        row[col.title] = col.render(item);
      } else {
        const val = item[col.key as keyof T];
        row[col.title] = val !== undefined && val !== null ? val : "";
      }
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  // Set RTL direction on the worksheet
  if (!worksheet["!views"]) worksheet["!views"] = [];
  worksheet["!views"].push({ rightToLeft: true });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "داده‌ها");

  const today = new Date().toLocaleDateString("fa-IR").replace(/\//g, "-");
  XLSX.writeFile(workbook, `${fileName}_${today}.xlsx`);
}

export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T | string; title: string; render?: (item: T) => unknown }[],
  fileName = "گزارش"
) {
  if (!data || data.length === 0) return;

  let csvContent = "\uFEFF"; // UTF-8 BOM for Persian Excel compatibility
  const headers = ["ردیف", ...columns.map((c) => c.title)];
  csvContent += headers.map((h) => `"${h}"`).join(",") + "\n";

  data.forEach((item, index) => {
    const row = [
      index + 1,
      ...columns.map((col) => {
        let val = col.render ? col.render(item) : item[col.key as keyof T];
        if (val === undefined || val === null) val = "";
        return `"${String(val).replace(/"/g, '""')}"`;
      }),
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const today = new Date().toLocaleDateString("fa-IR").replace(/\//g, "-");
  link.setAttribute("download", `${fileName}_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
