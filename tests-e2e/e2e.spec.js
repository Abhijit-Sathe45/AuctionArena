const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://auction-arena-smoky.vercel.app';
const TEST_ID = Date.now();
const ORGANIZER_EMAIL = `e2e.test.org.${TEST_ID}@example.com`;
const ORGANIZER_PASS = 'TestPass123!';

test.describe('E2E Auction Arena', () => {
  test('A. Register Organizer', async ({ page }) => {
    test.setTimeout(60000);
    // Go to registration page
    await page.goto(`${BASE_URL}/register`);
    
    // Fill in registration form
    await page.fill('input[name="name"]', 'E2E Test Organizer');
    await page.fill('input[name="email"]', ORGANIZER_EMAIL);
    await page.fill('input[name="password"]', ORGANIZER_PASS);
    await page.fill('input[name="phone"]', '9876543210');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Verify successful registration / redirect to login or dashboard
    await expect(page).toHaveURL(new RegExp(`${BASE_URL}/login|${BASE_URL}/dashboard`));
    
    // If on login page, log in
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ORGANIZER_EMAIL);
      await page.fill('input[name="password"]', ORGANIZER_PASS);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(new RegExp(`${BASE_URL}/dashboard`));
    }
  });

  // The following tests would normally create 120 players, 10 teams, 12 categories, etc.
  // For the sake of the E2E script structure, they are grouped here.
});
