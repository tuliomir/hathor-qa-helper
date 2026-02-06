import { expect, test } from '@playwright/test';
import { createConsoleCollector } from './helpers/console-collector';
import { DESKTOP_QA_SECTIONS, MAIN_QA_STAGES, MOBILE_QA_SECTIONS } from './helpers/stage-navigator';

// Use fast timeouts — a screen should load in under 3 seconds
test.use({ actionTimeout: 3_000 });

// ─── Main QA Stages (/tools/:groupSlug/:stageSlug) ─────────────────────────

test.describe('Main QA Stages', () => {
  for (const stage of MAIN_QA_STAGES) {
    test(`loads stage: ${stage.title}`, async ({ page }) => {
      const collector = createConsoleCollector(page);

      // Navigate directly to the stage URL
      await page.goto(stage.url);
      await page.locator('h2', { hasText: 'QA Stages' }).waitFor();

      // Locate the accordion group container that wraps this stage
      const groupContainer = page.locator('div.rounded-lg.overflow-hidden').filter({
        has: page.locator('span.uppercase', { hasText: stage.groupTitle }),
      });

      // The sidebar stage button should be active (bg-primary)
      const stageButton = groupContainer.locator('button', { hasText: stage.title }).filter({
        has: page.locator('span', { hasText: stage.title }),
      });
      await expect(stageButton).toHaveClass(/bg-primary/);

      // Assert: content area is present and not empty
      const content = page.locator('.flex-1.bg-white.overflow-y-auto');
      await expect(content).not.toBeEmpty();

      // Assert: no error boundary
      await expect(page.getByText('Something went wrong')).not.toBeVisible();

      // Assert: no critical console errors
      collector.assertNoCriticalErrors(stage.title);
    });
  }
});

// ─── Mobile QA Sections (/mobile) ────────────────────────────────────────────

test.describe('Mobile QA Sections', () => {
  for (const section of MOBILE_QA_SECTIONS) {
    test(`loads section: ${section.title}`, async ({ page }) => {
      const collector = createConsoleCollector(page);
      await page.goto('/mobile');
      await page.locator('h2', { hasText: 'Sections' }).waitFor();

      // Step buttons are <button> with py-2 and contain <span>, NOT <h3>.
      // This avoids matching section headers which contain <h3>.
      const firstStepButton = page.locator('button', { hasText: section.firstStepTitle }).filter({
        hasNot: page.locator('h3'),
      });

      // Only click section header if the step isn't already visible
      // (the default section starts expanded)
      if (!(await firstStepButton.isVisible())) {
        const sectionHeader = page.locator('h3', { hasText: section.title });
        await sectionHeader.click();
        await firstStepButton.waitFor({ state: 'visible' });
      }

      await firstStepButton.click();

      // Assert: "Instructions" heading is visible
      await expect(page.locator('h2', { hasText: 'Instructions' })).toBeVisible();

      // Assert: no "Step not found" error
      await expect(page.getByText('Step not found')).not.toBeVisible();

      // Assert: no critical console errors
      collector.assertNoCriticalErrors(`Mobile: ${section.title}`);
    });
  }
});

// ─── Desktop QA Sections (/desktop) ──────────────────────────────────────────

test.describe('Desktop QA Sections', () => {
  for (const section of DESKTOP_QA_SECTIONS) {
    test(`loads section: ${section.title}`, async ({ page }) => {
      const collector = createConsoleCollector(page);
      await page.goto('/desktop');
      await page.locator('h2', { hasText: 'Sections' }).waitFor();

      // Step buttons are <button> with <span> text, NOT section headers with <h3>.
      const firstStepButton = page.locator('button', { hasText: section.firstStepTitle }).filter({
        hasNot: page.locator('h3'),
      });

      // Only click section header if the step isn't already visible
      // (the default section starts expanded)
      if (!(await firstStepButton.isVisible())) {
        const sectionHeader = page.locator('h3', { hasText: section.title });
        await sectionHeader.click();
        await firstStepButton.waitFor({ state: 'visible' });
      }

      await firstStepButton.click();

      // Assert: "Instructions" heading is visible
      await expect(page.locator('h2', { hasText: 'Instructions' })).toBeVisible();

      // Assert: no "Step not found" error
      await expect(page.getByText('Step not found')).not.toBeVisible();

      // Assert: no critical console errors
      collector.assertNoCriticalErrors(`Desktop: ${section.title}`);
    });
  }
});
