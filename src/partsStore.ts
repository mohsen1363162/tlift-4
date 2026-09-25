import { useSyncExternalStore } from "react";

export type PartItem = {
  id: number;
  code: string;
  name: string;
  alias: string;
  unit: string;
  brand: string;
  country: string;
  desc: string;
  consumable: boolean;
  price: number;
};

const seed: [string, string, string, number][] = [
  ["1", "روغن دوزمانه", "عدد", 3500000],
  ["2", "دستمزد نصب تابلو", "عدد", 50000000],
  ["3", "بست ان اف", "عدد", 200000],
  ["5", "رنگ زدن شاخص طبقات", "عدد", 400000],
  ["2222", "رفع عیب", "عدد", 2000000],
  ["4587", "هزینه نظافت کامل آسانسور 2", "عدد", 2000000],
  ["6543", "خرابی", "عدد", 3000000],
  ["29039", "هزینه نظافت کامل آسانسور", "عدد", 3000000],
  ["29290", "روغن 4 لیتری", "عدد", 30000000],
  ["29291", "روغن 1 لیتری بهران", "لیتر", 280000],
  ["29292", "دستمزد تعویض روغن گیربکس", "عدد", 2000000],
  ["29309", "دستمزد تعویض کفشک", "عدد", 1000000],
];

function loadParts(): PartItem[] {
  try {
    const raw = localStorage.getItem("tlift_parts");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading tlift_parts", e);
  }
  return seed.map(([code, name, unit, price], i) => ({
    id: i + 1,
    code,
    name,
    alias: "",
    unit,
    brand: "",
    country: "",
    desc: "",
    consumable: true,
    price,
  }));
}

function saveParts(data: PartItem[]) {
  try {
    localStorage.setItem("tlift_parts", JSON.stringify(data));
  } catch (e) {
    console.warn("Error saving tlift_parts", e);
  }
}

let parts: PartItem[] = loadParts();

const listeners = new Set<() => void>();
const emit = () => {
  saveParts(parts);
  listeners.forEach((l) => l());
};

export const partsApi = {
  all: () => parts,
  add: (p: Omit<PartItem, "id">) => {
    parts = [{ ...p, id: parts.length + 1 }, ...parts];
    emit();
  },
  update: (p: PartItem) => {
    parts = parts.map((x) => (x.id === p.id ? p : x));
    emit();
  },
  remove: (id: number) => {
    parts = parts.filter((x) => x.id !== id);
    emit();
  },
};

export function useParts() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => parts
  );
}

export const UNITS = ["عدد", "لیتر", "متر", "کیلوگرم", "بسته", "حلقه", "جفت"];
export const COUNTRIES = ["ایران", "چین", "ترکیه", "آلمان", "ایتالیا", "کره جنوبی", "اسپانیا"];
export const CURRENCIES = ["ریال", "دلار", "یورو", "درهم", "لیر"];
