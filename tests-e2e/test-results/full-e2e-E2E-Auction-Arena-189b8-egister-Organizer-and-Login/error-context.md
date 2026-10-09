# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-e2e.spec.js >> E2E Auction Arena Complete Lifecycle >> A. Register Organizer and Login
- Location: full-e2e.spec.js:12:3

# Error details

```
Error: page.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('button:has-text("Free Demo Tier")')

```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | 
  3   | const BASE_URL = 'https://auction-arena-smoky.vercel.app';
  4   | const TEST_ID = Date.now();
  5   | const ORGANIZER_EMAIL = `e2e.org.${TEST_ID}@example.com`;
  6   | const ORGANIZER_PASS = 'TestPass123!';
  7   | 
  8   | test.describe.serial('E2E Auction Arena Complete Lifecycle', () => {
  9   |   // Use a very long timeout for the entire file since creating 120 players takes time
  10  |   test.setTimeout(1200000); 
  11  | 
  12  |   test('A. Register Organizer and Login', async ({ page }) => {
  13  |     await page.goto(`${BASE_URL}/get-started`);
  14  |     
  15  |     // Fill in registration form
  16  |     await page.locator('label:has-text("Tournament Name") + input').fill('E2E Test Tournament');
  17  |     await page.locator('label:has-text("Tournament Date") + input').fill('2026-12-01');
  18  |     await page.locator('label:has-text("Your Name (Organizer)") + input').fill('E2E Test Organizer');
  19  |     await page.locator('label:has-text("Email (will be your Login ID)") + input').fill(ORGANIZER_EMAIL);
  20  |     await page.locator('label:has-text("Phone") + input').fill('9876543210');
  21  |     await page.locator('label:has-text("Create Password")').locator('..').locator('input').fill(ORGANIZER_PASS);
  22  |     await page.locator('label:has-text("Confirm Password")').locator('..').locator('input').fill(ORGANIZER_PASS);
  23  |     
  24  |     // Select Free Demo Tier
> 25  |     await page.click('button:has-text("Free Demo Tier")');
      |                ^ Error: page.click: Target page, context or browser has been closed
  26  |     
  27  |     // Clicking Proceed to Payment triggers Free Tier account creation without Razorpay
  28  |     await page.click('button:has-text("Proceed to Payment")');
  29  |     
  30  |     // Wait for welcome screen
  31  |     await page.waitForSelector('text="Welcome Aboard!"', { timeout: 15000 });
  32  |     
  33  |     // Click Go to Organizer Login
  34  |     await page.click('button:has-text("Go to Organizer Login")');
  35  |     await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
  36  |     await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
  37  |     
  38  |     await page.click('button[type="submit"]');
  39  |     await page.waitForURL(/\/organizer\/dashboard/);
  40  |   });
  41  | 
  42  |   test('B. Create 120 Dummy Players', async ({ page }) => {
  43  |     await page.goto(`${BASE_URL}/organizer/login`);
  44  |     await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
  45  |     await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
  46  |     await page.click('button[type="submit"]');
  47  |     
  48  |     await page.goto(`${BASE_URL}/organizer/players`);
  49  |     
  50  |     // Creating 120 players sequentially
  51  |     for (let i = 1; i <= 120; i++) {
  52  |       const playerName = `Test Player ${i.toString().padStart(3, '0')}`;
  53  |       try {
  54  |         await page.click('button:has-text("Add Player"), button:has-text("New Player")'); 
  55  |         // We use generic selectors based on likely placeholder/label names
  56  |         await page.getByPlaceholder(/name/i).fill(playerName);
  57  |         
  58  |         // Fill base price if field exists
  59  |         const priceInput = page.getByPlaceholder(/price|base/i);
  60  |         if (await priceInput.count() > 0) {
  61  |           await priceInput.fill('1000');
  62  |         }
  63  |         
  64  |         // Select category if available
  65  |         const roleSelect = page.locator('select');
  66  |         if (await roleSelect.count() > 0) {
  67  |           await roleSelect.first().selectOption({ index: 1 });
  68  |         }
  69  |         
  70  |         await page.click('button:has-text("Save"), button:has-text("Submit"), button:has-text("Add")');
  71  |         
  72  |         // Brief wait to ensure UI processes it
  73  |         await page.waitForTimeout(500); 
  74  |       } catch (e) {
  75  |         console.log(`Warning: Failed to create ${playerName}. Ensure DOM locators match your Add Player modal.`);
  76  |       }
  77  |     }
  78  |   });
  79  | 
  80  |   test('C. Create 10 Teams', async ({ page }) => {
  81  |     const teams = ['Thunder Strikers', 'Royal Challengers', 'Falcon Warriors', 'Titan Blazers', 'Rising Panthers', 'Storm Breakers', 'Elite Eagles', 'Victory Titans', 'Power Gladiators', 'Dynamic Legends'];
  82  |     
  83  |     await page.goto(`${BASE_URL}/organizer/login`);
  84  |     await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
  85  |     await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
  86  |     await page.click('button[type="submit"]');
  87  | 
  88  |     await page.goto(`${BASE_URL}/organizer/teams`);
  89  |     
  90  |     for (const team of teams) {
  91  |       try {
  92  |         await page.click('button:has-text("Add Team"), button:has-text("New Team")');
  93  |         await page.getByPlaceholder(/team name/i).fill(team);
  94  |         
  95  |         const budgetInput = page.getByPlaceholder(/budget|purse/i);
  96  |         if (await budgetInput.count() > 0) {
  97  |           await budgetInput.fill('100000');
  98  |         }
  99  |         
  100 |         await page.click('button:has-text("Save"), button:has-text("Submit"), button:has-text("Add")');
  101 |         await page.waitForTimeout(500);
  102 |       } catch(e) {
  103 |          console.log(`Warning: Failed to create team ${team}.`);
  104 |       }
  105 |     }
  106 |   });
  107 | 
  108 |   test('D. Create 12 Categories', async ({ page }) => {
  109 |     const categories = ['Batsmen', 'Bowlers', 'All-Rounders', 'Wicketkeepers', 'Opening Players', 'Middle-Order Players', 'Finishers', 'Fast Bowlers', 'Spin Bowlers', 'Utility Players', 'Emerging Players', 'Experienced Players'];
  110 |     
  111 |     await page.goto(`${BASE_URL}/organizer/login`);
  112 |     await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
  113 |     await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
  114 |     await page.click('button[type="submit"]');
  115 |     
  116 |     await page.goto(`${BASE_URL}/organizer/categories`);
  117 |     
  118 |     for (const cat of categories) {
  119 |       try {
  120 |         await page.click('button:has-text("Add Category"), button:has-text("New Category")');
  121 |         await page.getByPlaceholder(/category name/i).fill(cat);
  122 |         await page.click('button:has-text("Save"), button:has-text("Submit"), button:has-text("Add")');
  123 |         await page.waitForTimeout(500);
  124 |       } catch (e) {
  125 |         console.log(`Warning: Failed to create category ${cat}.`);
```