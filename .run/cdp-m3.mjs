// M3 smoke: spiral preset → + mirror → + ring, screenshot; then a fresh square with grid 4×3, screenshot.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.argv[2] ?? "http://localhost:5180/";
const PORT = 9335;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=/tmp/geometry-chrome-profile-m3`, "--window-size=1400,900", "about:blank"], { stdio: "ignore" });
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
const click = (text) => evalJs(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === ${JSON.stringify(text.toLowerCase())}); if (!b) return 'MISSING ' + ${JSON.stringify(text)}; b.click(); return 'ok'; })()`);
const setRange = (label, v) => evalJs(`(() => { const el = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(String(v))}); el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
const state = () => evalJs(`JSON.stringify({ count: document.querySelector('.count')?.textContent, rules: [...document.querySelectorAll('.rule .name')].map(n => n.textContent), outs: [...document.querySelectorAll('.rule .out')].map(n => n.textContent) })`);

await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: URL_ });
for (let i = 0; i < 40; i++) { if (await evalJs("!!document.querySelector('.bar-actions .btn')")) break; await sleep(250); }
console.log(await click("Spiral preset"), await click("+ mirror"), await click("+ ring"));
await sleep(300);
console.log(await setRange("radius", 180), await setRange("count", 6)); // first "count" slider is the Repeat one; ring count comes second
await sleep(300);
console.log("chain:", await state());
await shot(".run/m3-chain.png");
// move the ring above the mirror and screenshot again
console.log(await click("↑"), "(moved first ↑ = mirror up? no-op if disabled)");
await evalJs(`document.querySelector('button[aria-label="Move ring rule up"]').click(); 'ok'`);
await sleep(300);
console.log("reordered:", await state());
await shot(".run/m3-reordered.png");
// new layer: square + grid
await evalJs(`document.querySelector('.library .fig').click(); 'ok'`); await sleep(100);
await evalJs(`[...document.querySelectorAll('.layers .row')].at(0).click(); 'ok'`); // hide the first layer visually by selecting the new one? selection dims others
await evalJs(`[...document.querySelectorAll('.layers .row')].at(-1).click(); 'ok'`);
console.log(await click("+ grid")); await sleep(300);
await setRange("columns", 4); await setRange("gap", 40); await sleep(300);
console.log("grid:", await state());
await shot(".run/m3-grid.png");
const errs = events.filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Log.entryAdded" && e.params.entry.level === "error"));
console.log("console errors:", errs.length, errs.map((e) => JSON.stringify(e.params).slice(0, 200)));
ws.close(); chrome.kill();
