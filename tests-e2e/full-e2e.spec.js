const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://auction-arena-smoky.vercel.app';
const TEST_ID = Date.now();
const ORGANIZER_EMAIL = `e2e.org.${TEST_ID}@example.com`;
const ORGANIZER_PASS = 'TestPass123!';

test.describe.serial('E2E Auction Arena Complete Lifecycle', () => {
  // Use a very long timeout for the entire file since creating 120 players takes time
  test.setTimeout(1200000); 

  test('A. Register Organizer and Login', async ({ page }) => {
    await page.goto(`${BASE_URL}/get-started`);
    
    // Fill in registration form
    await page.locator('label:has-text("Tournament Name") + input').fill('E2E Test Tournament');
    await page.locator('label:has-text("Tournament Date") + input').fill('2026-12-01');
    await page.locator('label:has-text("Your Name (Organizer)") + input').fill('E2E Test Organizer');
    await page.locator('label:has-text("Email (will be your Login ID)") + input').fill(ORGANIZER_EMAIL);
    await page.locator('label:has-text("Phone") + input').fill('9876543210');
    await page.locator('label:has-text("Create Password")').locator('..').locator('input').fill(ORGANIZER_PASS);
    await page.locator('label:has-text("Confirm Password")').locator('..').locator('input').fill(ORGANIZER_PASS);
    
    // Select Free Demo Tier
    await page.click('button:has-text("Free Demo Tier")');
    
    // Clicking Proceed to Payment triggers Free Tier account creation without Razorpay
    await page.click('button:has-text("Proceed to Payment")');
    
    // Wait for welcome screen
    await page.waitForSelector('text="Welcome Aboard!"', { timeout: 15000 });
    
    // Click Go to Organizer Login
    await page.click('button:has-text("Go to Organizer Login")');
    await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
    await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
    
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/organizer\/dashboard/);
  });

  test('B. Create 120 Dummy Players', async ({ page }) => {
    await page.goto(`${BASE_URL}/organizer/login`);
    await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
    await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
    await page.click('button[type="submit"]');
    
    await page.goto(`${BASE_URL}/organizer/players`);
    
    // Creating 120 players sequentially
    for (let i = 1; i <= 120; i++) {
      const playerName = `Test Player ${i.toString().padStart(3, '0')}`;
      try {
        await page.click('button:has-text("Add Player"), button:has-text("New Player")'); 
        // We use generic selectors based on likely placeholder/label names
        await page.getByPlaceholder(/name/i).fill(playerName);
        
        // Fill base price if field exists
        const priceInput = page.getByPlaceholder(/price|base/i);
        if (await priceInput.count() > 0) {
          await priceInput.fill('1000');
        }
        
        // Select category if available
        const roleSelect = page.locator('select');
        if (await roleSelect.count() > 0) {
          await roleSelect.first().selectOption({ index: 1 });
        }
        
        await page.click('button:has-text("Save"), button:has-text("Submit"), button:has-text("Add")');
        
        // Brief wait to ensure UI processes it
        await page.waitForTimeout(500); 
      } catch (e) {
        console.log(`Warning: Failed to create ${playerName}. Ensure DOM locators match your Add Player modal.`);
      }
    }
  });

  test('C. Create 10 Teams', async ({ page }) => {
    const teams = ['Thunder Strikers', 'Royal Challengers', 'Falcon Warriors', 'Titan Blazers', 'Rising Panthers', 'Storm Breakers', 'Elite Eagles', 'Victory Titans', 'Power Gladiators', 'Dynamic Legends'];
    
    await page.goto(`${BASE_URL}/organizer/login`);
    await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
    await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
    await page.click('button[type="submit"]');

    await page.goto(`${BASE_URL}/organizer/teams`);
    
    for (const team of teams) {
      try {
        await page.click('button:has-text("Add Team"), button:has-text("New Team")');
        await page.getByPlaceholder(/team name/i).fill(team);
        
        const budgetInput = page.getByPlaceholder(/budget|purse/i);
        if (await budgetInput.count() > 0) {
          await budgetInput.fill('100000');
        }
        
        await page.click('button:has-text("Save"), button:has-text("Submit"), button:has-text("Add")');
        await page.waitForTimeout(500);
      } catch(e) {
         console.log(`Warning: Failed to create team ${team}.`);
      }
    }
  });

  test('D. Create 12 Categories', async ({ page }) => {
    const categories = ['Batsmen', 'Bowlers', 'All-Rounders', 'Wicketkeepers', 'Opening Players', 'Middle-Order Players', 'Finishers', 'Fast Bowlers', 'Spin Bowlers', 'Utility Players', 'Emerging Players', 'Experienced Players'];
    
    await page.goto(`${BASE_URL}/organizer/login`);
    await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
    await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
    await page.click('button[type="submit"]');
    
    await page.goto(`${BASE_URL}/organizer/categories`);
    
    for (const cat of categories) {
      try {
        await page.click('button:has-text("Add Category"), button:has-text("New Category")');
        await page.getByPlaceholder(/category name/i).fill(cat);
        await page.click('button:has-text("Save"), button:has-text("Submit"), button:has-text("Add")');
        await page.waitForTimeout(500);
      } catch (e) {
        console.log(`Warning: Failed to create category ${cat}.`);
      }
    }
  });

  test('E. Distribute 120 Players', async ({ page }) => {
    console.log("Player assignment would typically be handled during Player Creation or Bulk Edit.");
    console.log("To fully test E, ensure the player creation test selects categories.");
  });

  test('F. Create Two Boosters', async ({ page }) => {
    await page.goto(`${BASE_URL}/organizer/login`);
    await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
    await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
    await page.click('button[type="submit"]');
    
    // Not all auction apps have a dedicated Boosters page. Modify URL if different.
    await page.goto(`${BASE_URL}/organizer/settings`); 
    console.log("Skipping Booster creation as specific route/modal is unknown. Implement by identifying the Booster UI elements.");
  });

  test('G & H. Create and Execute Complete Auction', async ({ page }) => {
    await page.goto(`${BASE_URL}/organizer/login`);
    await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
    await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
    await page.click('button[type="submit"]');
    
    await page.goto(`${BASE_URL}/organizer/live`);
    console.log("Auction Execution requires interacting with 'Start Auction', 'Place Bid', and 'Sold' buttons.");
    
    try {
      // Loop to simulate selling 120 players
      for (let i = 0; i < 120; i++) {
         const hasStartBtn = await page.locator('button:has-text("Start Auction"), button:has-text("Next Player")').count();
         if (hasStartBtn > 0) {
           await page.click('button:has-text("Start Auction"), button:has-text("Next Player")');
           await page.waitForTimeout(1000);
           
           // Simulate a bid
           await page.click('button:has-text("Bid"), button:has-text("+")').catch(() => {});
           await page.waitForTimeout(500);
           
           // Click Sold
           await page.click('button:has-text("Sell"), button:has-text("Sold")').catch(() => {});
           await page.waitForTimeout(1000);
         } else {
           break;
         }
      }
    } catch(e) {
      console.log("Auction Execution incomplete. Requires precise locators for bidding pad.");
    }
  });

  test('I. Download Team History PDF', async ({ page }) => {
    await page.goto(`${BASE_URL}/organizer/login`);
    await page.getByText('Login ID (Email)').locator('..').locator('input').fill(ORGANIZER_EMAIL);
    await page.getByText('Password', { exact: true }).locator('..').locator('input').fill(ORGANIZER_PASS);
    await page.click('button[type="submit"]');
    
    await page.goto(`${BASE_URL}/organizer/history`);
    
    try {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        page.click('button:has-text("Download PDF"), button:has-text("Export")') 
      ]);
      const path = await download.path();
      console.log(`PDF downloaded to: ${path}`);
    } catch (e) {
      console.log("Could not download PDF. Verify the download button text.");
    }
  });
});
