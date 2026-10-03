// M5 smoke: presets, undo/redo buttons, persistence across reload, phone layout at 400px.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.argv[2] ?? "http://localhost:5180/";
const PORT = 9337;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=/tmp/geometry-chrome-profile-m5-${Date.now()}`, "--window-size=1400,900", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.length) break; } catch {} await sleep(250); }
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const events = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (out) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(out, Buffer.from(s.result.data, "base64")); };
const click = (text) => evalJs(`(() => { const b = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent).trim().toLowerCase() === ${JSON.stringify(text.toLowerCase())}); if (!b) return 'MISSING ' + ${JSON.stringify(text)}; if (b.disabled) return 'DISABLED ' + ${JSON.stringify(text)}; b.click(); return 'ok'; })()`);
const state = () => evalJs(`JSON.stringify({ layers: document.querySelectorAll('.layers li').length, rules: document.querySelectorAll('.rule').length, count: document.querySelector('.rules .count')?.textContent ?? null, undo: !document.querySelector('[aria-label="Undo"]').disabled, redo: !document.querySelector('[aria-label="Redo"]').disabled, ls: !!localStorage.getItem('shape-multiplier:doc:v1') })`);
const waitApp = async () => { for (let i = 0; i < 40; i++) { if (await evalJs("!!document.querySelector('.bar-actions .btn')")) return; await sleep(250); } };

await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: URL_ }); await waitApp();
await evalJs("localStorage.clear(); 'ok'");
console.log("fresh:", await state());
console.log(await click("Rosette"), await click("Tile")); await sleep(400);
console.log("two presets:", await state());
await shot(".run/m5-presets.png");
console.log(await click("Undo")); await sleep(600); // Tile added figure+layer+3 rules+fit in one burst → one undo
console.log("after undo:", await state());
console.log(await click("Redo")); await sleep(600);
console.log("after redo:", await state());
await sleep(500); // autosave debounce
console.log("saved:", await evalJs("JSON.parse(localStorage.getItem('shape-multiplier:doc:v1')).layers.length"));
await send("Page.reload"); await sleep(500); await waitApp(); await sleep(300);
console.log("after reload:", await state());
// phone layout
await send("Emulation.setDeviceMetricsOverride", { width: 400, height: 800, deviceScaleFactor: 2, mobile: true });
await sleep(400);
console.log("phone:", await evalJs(`JSON.stringify({ tabs: [...document.querySelectorAll('[role=tab]')].map(t => t.textContent), hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, width: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth })`));
await shot(".run/m5-phone-library.png");
await evalJs(`document.querySelectorAll('[role=tab]')[1].click(); 'ok'`); await sleep(300);
await shot(".run/m5-phone-rules.png");
console.log("phone rules tab:", await evalJs(`JSON.stringify({ rules: document.querySelectorAll('.rule').length, hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth })`));
const errs = events.filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Log.entryAdded" && e.params.entry.level === "error"));
console.log("console errors:", errs.length, errs.map((e) => JSON.stringify(e.params).slice(0, 200)));
ws.close(); chrome.kill();
