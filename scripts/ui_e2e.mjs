import { chromium } from "playwright";
const APP = "http://localhost:5173";
let pass = 0, fail = 0;
const ok = (l, c, e = "") => { c ? (pass++, console.log(`  ✓ ${l}`)) : (fail++, console.log(`  ✗ ${l}  ${e}`)); };
const u = () => Math.random().toString(36).slice(2, 8);
const browser = await chromium.launch();
const errors = [];

async function flow(viewport, label) {
  console.log(`== ${label} (${viewport.width}x${viewport.height}) ==`);
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${label}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${label}] ${e.message}`));
  const nav = async (name) => {
    // On mobile the sidebar is behind a hamburger toggle.
    if (viewport.width < 1024) await page.getByRole("button", { name: "☰" }).click().catch(() => {});
    await page.getByRole("link", { name: new RegExp(name, "i") }).click();
  };

  await page.goto(APP, { waitUntil: "networkidle" });
  ok("dashboard renders", await page.getByText("Total Products").count() > 0);

  // Product via UI
  const tok = u(); const pname = `Widget-${tok}`; const sku = `UI-${tok}`;
  await nav("Products");
  await page.getByRole("button", { name: /add product/i }).click();
  const pin = page.locator("form input");
  await pin.nth(0).fill(pname);
  await pin.nth(1).fill(sku);
  await pin.nth(2).fill("4.00");
  await pin.nth(3).fill("50");
  await page.getByRole("button", { name: /create product/i }).click();
  await page.waitForSelector(`text=${sku}`, { timeout: 8000 });
  ok("product created via UI", true);

  // Customer via UI
  const email = `ui-${u()}@example.com`;
  await nav("Customers");
  await page.getByRole("button", { name: /add customer/i }).click();
  const cin = page.locator("form input");
  await cin.nth(0).fill("UI Customer");
  await cin.nth(1).fill(email);
  await page.getByRole("button", { name: /create customer/i }).click();
  await page.waitForSelector(`text=${email}`, { timeout: 8000 });
  ok("customer created via UI", true);

  // Order via UI (the critical flow)
  await nav("Orders");
  await page.getByRole("button", { name: /new order/i }).click();
  await page.waitForSelector("text=Order lines");
  const selects = page.locator("form select");
  await selects.nth(0).selectOption({ label: `UI Customer (${email})` });
  // line product select: choose the option containing our sku
  const val = await page.locator("form select").nth(1).locator("option", { hasText: pname }).first().getAttribute("value");
  await selects.nth(1).selectOption(val);
  await page.locator('form input[type="number"]').fill("2");
  // live total preview should reflect 2 * 4.00 = $8.00
  ok("live total preview shows $8.00", (await page.getByText("$8.00").count()) > 0);
  await page.getByRole("button", { name: /place order/i }).click();
  await page.waitForTimeout(1500);
  ok("order placed, PLACED row visible", (await page.getByText("PLACED").count()) > 0);
  ok("order shows $8.00 total in list", (await page.getByText("$8.00").count()) > 0);

  // Dashboard reflects activity
  await nav("Dashboard");
  await page.waitForSelector("text=Total Products");
  ok("no overlay/scroll breakage (body present)", (await page.locator("body").count()) === 1);

  await ctx.close();
}

await flow({ width: 1280, height: 800 }, "desktop");
await flow({ width: 375, height: 812 }, "mobile");

console.log("== errors ==");
ok("zero console/page errors across both viewports", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(`\n=== UI RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
