// M4 smoke: spiral preset → scrub timeline to 5 → screenshot; play → mid screenshot; export SVG/PNG via intercepted downloads.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.argv[2] ?? "http://localhost:5180/";
const PORT = 9336;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=/tmp/geometry-chrome-profile-m4`, "--window-size=1400,900", "about:blank"], { stdio: "ignore" });
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
const click = (text) => evalJs(`(() => { const b = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent).trim().toLowerCase() === ${JSON.stringify(text.toLowerCase())}); if (!b) return 'MISSING ' + ${JSON.stringify(text)}; b.click(); return 'ok'; })()`);
const setRange = (label, v) => evalJs(`(() => { const el = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(String(v))}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);

await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: URL_ });
for (let i = 0; i < 40; i++) { if (await evalJs("!!document.querySelector('.bar-actions .btn')")) break; await sleep(250); }
// intercept downloads: capture blob text / size instead of saving
await evalJs(`window.__dl = []; HTMLAnchorElement.prototype.click = function () { const b = window.__blobs?.[this.href]; window.__dl.push({ name: this.download, type: b?.type, size: b?.size }); if (b && b.type === 'image/svg+xml') b.text().then(t => window.__svg = t); if (b && b.type === 'image/png') { const img = new Image(); img.onload = () => { window.__png = [img.naturalWidth, img.naturalHeight]; }; img.src = this.href; } };
  window.__blobs = {}; const orig = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { const u = orig(b); window.__blobs[u] = b; return u; }; URL.revokeObjectURL = () => {}; 'ok'`);
console.log(await click("Spiral preset")); await sleep(300);
console.log(await setRange("Shown instances", 5)); await sleep(300);
console.log("scrub:", await evalJs(`document.querySelector('.tl-count').textContent`));
await shot(".run/m4-scrub.png");
console.log(await click("Play")); await sleep(700);
console.log("mid-play:", await evalJs(`document.querySelector('.tl-count').textContent`), await evalJs(`document.querySelector('.timeline .play').getAttribute('aria-label')`));
await shot(".run/m4-play.png");
await sleep(2500);
console.log("after play:", await evalJs(`document.querySelector('.tl-count').textContent`), await evalJs(`document.querySelector('.timeline .play').getAttribute('aria-label')`));
console.log(await click("Export SVG")); await sleep(300);
await evalJs(`(() => { const s = document.querySelector('select[aria-label="PNG scale"]'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, '4'); s.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`);
console.log(await click("Export PNG")); await sleep(1500);
console.log("downloads:", await evalJs(`JSON.stringify(window.__dl)`));
console.log("svg uses:", await evalJs(`(window.__svg || '').match(/<use /g)?.length`), "png size:", await evalJs(`JSON.stringify(window.__png)`));
const errs = events.filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Log.entryAdded" && e.params.entry.level === "error"));
console.log("console errors:", errs.length, errs.map((e) => JSON.stringify(e.params).slice(0, 200)));
ws.close(); chrome.kill();
