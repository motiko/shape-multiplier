/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // give the browser a tick to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestampName(base: string, ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.${ext}`;
}
