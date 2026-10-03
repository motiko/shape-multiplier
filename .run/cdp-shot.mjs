// Drive headless Chrome over CDP: open the app, click "load the samples", screenshot.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.argv[2] ?? "http://localhost:5180/";
const OUT = process.argv[3] ?? "shot.png";
const PORT = 9333;

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=/tmp/geometry-chrome-profile`, "--window-size=1400,900", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.length) break; } catch {}
  await sleep(250);
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const events = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result;

await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: URL_ });
for (let i = 0; i < 40; i++) { const r = await evalJs("!!document.querySelector('.link')"); if (r.result?.value) break; await sleep(250); }
console.log("link present:", (await evalJs("!!document.querySelector('.link')")).result?.value);
await evalJs("document.querySelector('.link').click(); 'clicked'");
await sleep(600);
const state = await evalJs(`JSON.stringify({
  layers: document.querySelectorAll('.layers li').length,
  figures: document.querySelectorAll('.library li').length,
  canvas: (() => { const c = document.querySelector('canvas'); return c && [c.width, c.height]; })(),
  inkPixels: (() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for (let i=3;i<d.length;i+=4) if (d[i]>0) n++; return n; })(),
})`);
console.log("state:", state.result?.value);
// optional: upload a real SVG through the file input
const UPLOAD = process.argv[4];
if (UPLOAD) {
  await send("DOM.enable");
  const doc = await send("DOM.getDocument", { depth: 1 });
  const node = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "#svg-file-input" });
  await send("DOM.setFileInputFiles", { nodeId: node.result.nodeId, files: [UPLOAD] });
  await sleep(600);
  // place the uploaded figure (last library item) and select it
  await evalJs("[...document.querySelectorAll('.library .fig')].at(-1).click(); 'placed'");
  await sleep(400);
  console.log("after upload:", (await evalJs(`JSON.stringify({ figures: document.querySelectorAll('.library li').length, layers: document.querySelectorAll('.layers li').length, skipped: document.querySelector('.library em')?.title ?? null, toast: document.querySelector('.toast')?.textContent ?? null })`)).result?.value);
}
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(OUT, Buffer.from(shot.result.data, "base64"));
const errs = events.filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Log.entryAdded" && e.params.entry.level === "error"));
console.log("console errors:", errs.length, errs.map((e) => JSON.stringify(e.params).slice(0, 200)));
ws.close(); chrome.kill();
