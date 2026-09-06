import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('@claim:sample-offline keeps the bundled demo available after offline reload', async ({ page, context }) => {
  await page.goto('/demo');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await page.reload(); // the now-active worker controls the next navigation
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Inspect a GPU memory test receipt.' })).toBeVisible();
  await expect(page.getByText('NVIDIA GeForce RTX 5080')).toBeVisible();
});

test('@claim:casefile-export downloads a JSON casefile containing each named stage', async ({ page }) => {
  await page.goto('/demo');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON casefile' }).click();
  const payload = JSON.parse(await (await download).createReadStream().then(async stream => {
    let text = ''; for await (const chunk of stream!) text += chunk; return text;
  }));
  expect(payload.stages.map((stage: { name: string }) => stage.name)).toEqual(['Allocate', 'Fill patterns', 'Copy path', 'Readback', 'Shader sweep']);
});

test('@claim:html-casefile downloads a printable HTML casefile', async ({ page }) => {
  await page.goto('/demo');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download HTML casefile' }).click();
  const html = await (await download).createReadStream().then(async stream => {
    let text = ''; for await (const chunk of stream!) text += chunk; return text;
  });
  expect(html).toContain('<table>');
  expect(html).toContain('NVIDIA GeForce RTX 5080');
});

test('demo storage is isolated and reset discards only demo data', async ({ page }) => {
  await page.goto('/demo');
  await page.evaluate(() => localStorage.setItem('gpu-vram-burnin:receipt', JSON.stringify({
    id: 'REAL', startedAt: '2026-09-06T00:00:00.000Z', gpu: 'Real GPU', temperature: 60,
    confidence: 'Saved local result', demo: false,
    stages: [{ name: 'Allocate', result: 'pass', bytes: '1.0 GiB', detail: 'Saved stage', errors: 0 }]
  })));
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('demo:gpu-vram-burnin:receipt'))).not.toBeNull();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('demo:gpu-vram-burnin:receipt'))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('gpu-vram-burnin:receipt'))).toContain('REAL');
});

test('recovers from an invalid saved receipt without blanking the app', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gpu-vram-burnin:receipt', JSON.stringify({ id: 'corrupt-but-valid-json' })));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Test GPU memory before long jobs.' })).toBeVisible();
  await expect(page.locator('.recovery')).toContainText('Saved test receipt could not be read. It was removed. Start a new test.');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('gpu-vram-burnin:receipt'))).toBeNull();
});

test('client navigation focuses and announces the destination heading', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page).toHaveURL('/privacy');
  await expect(page.getByRole('heading', { name: 'Your test data stays on this device.' })).toBeFocused();
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Privacy.');
});

test('keyboard and restore field remain operable at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Skip to content')).toBeFocused();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await expect(page.getByLabel('Have a license? Paste it')).toBeVisible();
});

test('@claim:basic-free keeps the basic sample receipt and exports available without checkout', async ({ page }) => {
  const checkoutRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/checkout')) checkoutRequests.push(request.url()); });
  await page.goto('/demo');
  await expect(page.getByRole('button', { name: 'Download JSON casefile' })).toBeEnabled();
  expect(checkoutRequests).toEqual([]);
});

test('@claim:no-telemetry sends no diagnostic data away during the demo flow', async ({ page }) => {
  const external: string[] = [];
  const productOrigin = 'http://127.0.0.1:4173';
  page.on('request', request => { if (new URL(request.url()).origin !== productOrigin) external.push(request.url()); });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Download JSON casefile' }).click();
  expect(external).toEqual([]);
});

test('@claim:local-signing reuses one local identity and produces a verifiable casefile', async ({ page }) => {
  await page.goto('/demo');
  await page.evaluate(() => localStorage.setItem('sb_license_cache:gpu-vram-burnin', JSON.stringify({ token: 'sandbox-license', valid: true, checkedAt: Date.now() })));
  await page.reload();
  const signed = async () => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download signed JSON' }).click();
    const stream = await (await download).createReadStream();
    let output = ''; for await (const chunk of stream!) output += chunk;
    return JSON.parse(output) as { casefile: object; signature: { value: string; public_key: JsonWebKey; key_id: string } };
  };
  const first = await signed();
  const second = await signed();
  expect(first.signature.key_id).toMatch(/^local-p256:[a-f0-9]{24}$/);
  expect(second.signature.key_id).toBe(first.signature.key_id);
  const valid = await page.evaluate(async signedCasefile => {
    const publicKey = await crypto.subtle.importKey('jwk', signedCasefile.signature.public_key, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
    const bytes = Uint8Array.from(atob(signedCasefile.signature.value), character => character.charCodeAt(0));
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, bytes, new TextEncoder().encode(JSON.stringify(signedCasefile.casefile, null, 2)));
  }, first);
  expect(valid).toBe(true);
});

test('configured preview serves the demo route rather than relying on deployment rewrites', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Inspect a GPU memory test receipt.' })).toBeVisible();
});

test('public routes load without console or page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/', '/demo', '/privacy', '/terms', '/404.html']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('static 404 uses the shared accessible shell without CSP errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/404.html', async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
      }
    });
  });
  await page.goto('/404.html');
  await expect(page.getByText('Skip to content')).toBeVisible();
  await expect(page.locator('header')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This page was not found.' })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const path of ['/', '/demo', '/privacy', '/terms', '/404.html']) {
  test(`accessibility has no serious or critical violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  });
}
