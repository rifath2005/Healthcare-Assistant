import { test, expect } from "@playwright/test";

test.describe("Authentication Workflows", () => {
  test("Signup validation displays inline error messages on invalid input", async ({ page }) => {
    await page.goto("/signup");

    // Click submit with empty fields
    const submitBtn = page.getByRole("button", { name: /create account/i });
    expect(await submitBtn.isDisabled()).toBe(true);

    // Fill invalid weak password
    await page.fill('input[placeholder="Jane Doe"]', "A"); // too short
    await page.fill('input[type="email"]', "invalid-email");
    await page.fill('input[name="password"]', "weak");
    await page.fill('input[name="confirmPassword"]', "different");

    // Blur to trigger real-time validation
    await page.locator('input[name="confirmPassword"]').blur();

    // Assert validation error messages appear
    await expect(page.getByText(/Full name must be at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/Please provide a valid email address/i)).toBeVisible();
    await expect(page.getByText(/Password must contain at least 1 uppercase/i)).toBeVisible();
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
  });

  test("Login page displays error alert on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "nonexistent.patient@example.com");
    await page.fill('input[type="password"]', "WrongPassword123!");

    const submitBtn = page.getByRole("button", { name: /sign in/i });
    await submitBtn.click();

    // Assert error notice appears
    await expect(
      page.getByText(/Invalid email or password|credentials|error/i)
    ).toBeVisible({ timeout: 6000 });
  });
});
