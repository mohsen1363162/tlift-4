import { pushKey } from "../cloudSync";

export interface FullBackupFile {
  format: "tlift-full-backup";
  version: 1;
  createdAt: string;
  entries: Record<string, unknown>;
}

const isDataKey = (key: string) => key.startsWith("tlift_") &&
  !key.endsWith("__backup") &&
  !key.includes("sync_queue") &&
  !key.includes("sync_interval") &&
  !key.includes("manual_offline");

export function createFullBackup(): FullBackupFile {
  const entries: Record<string, unknown> = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key || !isDataKey(key)) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try { entries[key] = JSON.parse(raw); }
    catch { entries[key] = raw; }
  }
  return { format: "tlift-full-backup", version: 1, createdAt: new Date().toISOString(), entries };
}

export function downloadFullBackup() {
  const backup = createFullBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tlift-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return Object.keys(backup.entries).length;
}

export async function restoreFullBackup(file: File) {
  const parsed = JSON.parse(await file.text()) as FullBackupFile;
  if (parsed.format !== "tlift-full-backup" || parsed.version !== 1 || !parsed.entries) {
    throw new Error("این فایل، پشتیبان کامل معتبر تلیفت نیست.");
  }
  let restored = 0;
  Object.entries(parsed.entries).forEach(([key, value]) => {
    if (!isDataKey(key)) return;
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(`${key}__backup`, JSON.stringify(value));
    pushKey(key, value);
    restored++;
  });
  return { restored, createdAt: parsed.createdAt };
}
