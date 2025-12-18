const { test, expect } = require('@playwright/test');

test.describe('User Authentication Integration Tests', () => {
  let testEmail;
  let testPassword;

  test.beforeEach(async ({ page }) => {
    testEmail = `test${Date.now()}@example.com`;
    testPassword = 'TestPassword123';
    await page.goto('/');
  });

  test('should show authentication tabs on load', async ({ page }) => {
    // Check that all three tabs exist
    await expect(page.locator('#tab-user-login')).toBeVisible();
    await expect(page.locator('#tab-user-register')).toBeVisible();
    await expect(page.locator('#tab-community')).toBeVisible();

    // Login tab should be active by default
    await expect(page.locator('#tab-user-login')).toHaveClass(/active/);

    // Login form should be visible
    await expect(page.locator('#user-login-form')).toBeVisible();

    // Register and community forms should be hidden
    await expect(page.locator('#user-register-form')).not.toBeVisible();
    await expect(page.locator('#community-form')).not.toBeVisible();
  });

  test('should switch between authentication tabs', async ({ page }) => {
    // Click on Register tab
    await page.click('#tab-user-register');
    await expect(page.locator('#user-register-form')).toBeVisible();
    await expect(page.locator('#user-login-form')).not.toBeVisible();
    await expect(page.locator('#tab-user-register')).toHaveClass(/active/);

    // Click on Community ID tab
    await page.click('#tab-community');
    await expect(page.locator('#community-form')).toBeVisible();
    await expect(page.locator('#user-register-form')).not.toBeVisible();
    await expect(page.locator('#tab-community')).toHaveClass(/active/);

    // Click back to Login tab
    await page.click('#tab-user-login');
    await expect(page.locator('#user-login-form')).toBeVisible();
    await expect(page.locator('#community-form')).not.toBeVisible();
    await expect(page.locator('#tab-user-login')).toHaveClass(/active/);
  });

  test('should register a new user successfully', async ({ page }) => {
    // Switch to Register tab
    await page.click('#tab-user-register');

    // Fill in registration form
    await page.fill('#register-email', testEmail);
    await page.fill('#register-password', testPassword);
    await page.fill('#register-password-confirm', testPassword);

    // Click register button
    await page.click('button:has-text("Create Account")');

    // Wait for either profile section or error
    const result = await Promise.race([
      page
        .waitForSelector('#profile-section', { state: 'visible', timeout: 10000 })
        .then(() => 'success'),
      page
        .waitForSelector('#auth-status.error', { state: 'visible', timeout: 10000 })
        .then(() => 'error'),
    ]);

    if (result === 'error') {
      const errorText = await page.locator('#auth-status').textContent();
      throw new Error(`Registration failed: ${errorText}`);
    }

    // Verify we're logged in
    await expect(page.locator('#profile-section')).toBeVisible();
    await expect(page.locator('#auth-section')).not.toBeVisible();

    // Verify a default community was created
    const communityName = await page.locator('#profile-name').textContent();
    expect(communityName).toBeTruthy();
  });

  test('should validate password requirements', async ({ page }) => {
    // Switch to Register tab
    await page.click('#tab-user-register');

    // Test weak password (too short)
    await page.fill('#register-email', testEmail);
    await page.fill('#register-password', 'weak');
    await page.fill('#register-password-confirm', 'weak');
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('#auth-status.error')).toContainText('at least 8 characters');

    // Test password without uppercase
    await page.fill('#register-password', 'password123');
    await page.fill('#register-password-confirm', 'password123');
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('#auth-status.error')).toContainText('uppercase');

    // Test password without number
    await page.fill('#register-password', 'PasswordABC');
    await page.fill('#register-password-confirm', 'PasswordABC');
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('#auth-status.error')).toContainText('number');
  });

  test('should validate password confirmation match', async ({ page }) => {
    // Switch to Register tab
    await page.click('#tab-user-register');

    // Fill in non-matching passwords
    await page.fill('#register-email', testEmail);
    await page.fill('#register-password', testPassword);
    await page.fill('#register-password-confirm', 'DifferentPassword123');
    await page.click('button:has-text("Create Account")');

    // Should show error
    await expect(page.locator('#auth-status.error')).toContainText('do not match');
  });

  test('should login existing user successfully', async ({ page }) => {
    // First register a user
    await page.click('#tab-user-register');
    await page.fill('#register-email', testEmail);
    await page.fill('#register-password', testPassword);
    await page.fill('#register-password-confirm', testPassword);
    await page.click('button:has-text("Create Account")');
    await page.waitForSelector('#profile-section', { state: 'visible', timeout: 10000 });

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForSelector('#auth-section', { state: 'visible' });

    // Now login with the same credentials
    await page.fill('#login-email', testEmail);
    await page.fill('#login-password', testPassword);
    await page.click('button:has-text("Login")');

    // Wait for profile section
    const result = await Promise.race([
      page
        .waitForSelector('#profile-section', { state: 'visible', timeout: 10000 })
        .then(() => 'success'),
      page
        .waitForSelector('#auth-status.error', { state: 'visible', timeout: 10000 })
        .then(() => 'error'),
    ]);

    if (result === 'error') {
      const errorText = await page.locator('#auth-status').textContent();
      throw new Error(`Login failed: ${errorText}`);
    }

    // Verify we're logged in
    await expect(page.locator('#profile-section')).toBeVisible();
    await expect(page.locator('#auth-section')).not.toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    // Try to login with non-existent credentials
    await page.fill('#login-email', 'nonexistent@example.com');
    await page.fill('#login-password', 'WrongPassword123');
    await page.click('button:has-text("Login")');

    // Should show error
    await expect(page.locator('#auth-status.error')).toBeVisible();
  });

  test('should logout and clear user session', async ({ page }) => {
    // Register and login
    await page.click('#tab-user-register');
    await page.fill('#register-email', testEmail);
    await page.fill('#register-password', testPassword);
    await page.fill('#register-password-confirm', testPassword);
    await page.click('button:has-text("Create Account")');
    await page.waitForSelector('#profile-section', { state: 'visible', timeout: 10000 });

    // Logout
    await page.click('button:has-text("Logout")');

    // Verify we're back to auth section
    await expect(page.locator('#auth-section')).toBeVisible();
    await expect(page.locator('#profile-section')).not.toBeVisible();

    // Verify localStorage is cleared
    const jwtToken = await page.evaluate(() => localStorage.getItem('omnistream_jwt_token'));
    expect(jwtToken).toBeNull();
  });

  test('should preserve legacy community ID functionality', async ({ page }) => {
    // Switch to Community ID tab
    await page.click('#tab-community');

    // Verify the legacy form is visible
    await expect(page.locator('#community-form')).toBeVisible();
    await expect(page.locator('#community-name')).toBeVisible();
    await expect(page.locator('#login-communityid')).toBeVisible();

    // Create a community the old way
    const communityName = `Legacy Community ${Date.now()}`;
    await page.fill('#community-name', communityName);
    await page.click('button:has-text("Create Community")');

    // Should still work
    const result = await Promise.race([
      page
        .waitForSelector('#profile-section', { state: 'visible', timeout: 10000 })
        .then(() => 'success'),
      page
        .waitForSelector('#auth-status.error', { state: 'visible', timeout: 10000 })
        .then(() => 'error'),
    ]);

    if (result === 'error') {
      const errorText = await page.locator('#auth-status').textContent();
      throw new Error(`Legacy community creation failed: ${errorText}`);
    }

    await expect(page.locator('#profile-section')).toBeVisible();
    await expect(page.locator('#profile-name')).toContainText(communityName);
  });
});
