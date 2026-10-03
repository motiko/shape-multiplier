// M2 smoke: open app, click "Spiral preset", screenshot; then move the count slider and screenshot again.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.argv[2] ?? "http://localhost:5180/";
const PORT = 9334;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=/tmp/geometry-chrome-profile-m2`, "--window-size=1400,900", "about:blank"], { stdio: "ignore" });
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
const ink = `(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for (let i=3;i<d.length;i+=4) if (d[i]>0) n++; return n; })()`;

await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: URL_ });
for (let i = 0; i < 40; i++) { if (await evalJs("!!document.querySelector('.bar-actions .btn')")) break; await sleep(250); }
await evalJs("document.querySelector('.bar-actions .btn').click(); 'ok'"); await sleep(600);
console.log("after preset:", await evalJs(`JSON.stringify({ count: document.querySelector('.count')?.textContent, rules: document.querySelectorAll('.rule').length, ink: ${ink} })`));
await shot(".run/m2-spiral.png");
// move count slider to 4 via native setter so React sees it
await evalJs(`(() => { const el = document.querySelector('input[aria-label="count"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '4'); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
await sleep(400);
console.log("after slider:", await evalJs(`JSON.stringify({ count: document.querySelector('.count')?.textContent, ink: ${ink} })`));
await shot(".run/m2-count4.png");
const errs = events.filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Log.entryAdded" && e.params.entry.level === "error"));
console.log("console errors:", errs.length, errs.map((e) => JSON.stringify(e.params).slice(0, 200)));
ws.close(); chrome.kill();
