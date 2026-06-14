import { test, expect } from '@playwright/test';

// Le backend n'est pas démarré en e2e : on intercepte les appels /api pour que
// l'app rende son shell de manière déterministe (ce smoke vérifie le front + le
// routing, pas l'API). Il attrape les régressions de montage / crash de route.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
});

test('la page d’accueil monte bien l’application', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();
});

test('navigation vers /products sans crash', async ({ page }) => {
  await page.goto('/products');
  await expect(page).toHaveURL(/\/products/);
  await expect(page.locator('#root')).not.toBeEmpty();
});

test('la page /checkout se charge (route critique du paiement)', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.locator('#root')).not.toBeEmpty();
});

// Les pages statiques principales doivent toutes monter sans crash.
for (const path of ['/services', '/contact', '/cgv', '/mentions-legales']) {
  test(`la page ${path} se charge sans crash`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('#root')).not.toBeEmpty();
  });
}
