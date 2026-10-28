import { test, expect } from "@playwright/test";

test.describe("Healthcare Chatbot & Booking E2E Flow", () => {
  test("First-time visitor accepts medical disclaimer modal and engages in conversation", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Verify and accept Medical Disclaimer Consent Modal if visible
    const consentCheckbox = page.locator("#modal-consent-checkbox");
    if (await consentCheckbox.isVisible()) {
      await consentCheckbox.check();
      const ackButton = page.getByRole("button", { name: /Acknowledge & Continue/i });
      await ackButton.click();
    }

    // 2. Verify chat container is rendered
    await expect(page.getByText(/Smart Healthcare Assistant/i)).toBeVisible();

    // 3. Send symptom inquiry
    const chatInput = page.getByPlaceholder(/Describe your symptoms/i);
    await chatInput.fill("I have had a dull tension headache for 2 days");
    await page.keyboard.press("Enter");

    // 4. Verify user message appears in chat
    await expect(page.getByText("I have had a dull tension headache for 2 days")).toBeVisible();

    // 5. Open Appointment Booking modal
    const bookDoctorTrigger = page.getByRole("button", { name: /Book Doctor|Schedule/i });
    if (await bookDoctorTrigger.isVisible()) {
      await bookDoctorTrigger.first().click();
      await expect(page.getByText(/Schedule a Doctor Consultation/i)).toBeVisible();
    }
  });

  test("Crisis intervention banner displays immediately when self-harm text is submitted", async ({
    page,
  }) => {
    await page.goto("/");

    // Bypass modal
    const consentCheckbox = page.locator("#modal-consent-checkbox");
    if (await consentCheckbox.isVisible()) {
      await consentCheckbox.check();
      await page.getByRole("button", { name: /Acknowledge & Continue/i }).click();
    }

    const chatInput = page.getByPlaceholder(/Describe your symptoms/i);
    await chatInput.fill("I want to kill myself");
    await page.keyboard.press("Enter");

    // Verify crisis emergency banner
    await expect(page.getByText(/Immediate Crisis Intervention Active/i)).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByText(/Call\/Text 988 Lifeline/i)).toBeVisible();
  });
});
