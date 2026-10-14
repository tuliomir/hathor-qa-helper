import { expect, test } from '@playwright/test';
import { createConsoleCollector } from './helpers/console-collector';
import { DESKTOP_QA_SECTIONS, MAIN_QA_STAGES, MOBILE_QA_SECTIONS } from './helpers/stage-navigator';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Use fast timeouts — a screen should load in under 3 seconds
test.use({ actionTimeout: 3_000 });

// ─── Main QA Stages (/tools/:groupSlug/:stageSlug) ─────────────────────────

test.describe('Main QA Stages', () => {
  for (const stage of MAIN_QA_STAGES) {
    test(`loads stage: ${stage.familyTitle} / ${stage.groupTitle} / ${stage.title}`, async ({ page }) => {
      const collector = createConsoleCollector(page);

      // Navigate directly to the stage URL
      await page.goto(stage.url);
      const nav = page.getByRole('navigation', { name: 'Stages' });

      // The stage's group is expanded inside its family section
      const family = nav.getByRole('region', { name: stage.familyTitle });
      const groupButton = family.getByRole('button', { name: new RegExp(`^${escapeRegExp(stage.groupTitle)}\\b`) });
      await expect(groupButton).toHaveAttribute('aria-expanded', 'true');

      // The sidebar row for this stage is the current page
      const stageLink = nav.getByRole('link', { name: stage.title, exact: true });
      await expect(stageLink).toHaveAttribute('aria-current', 'page');
      await expect(stageLink).toBeInViewport();

      // Assert: content area is present and not empty
      await expect(page.getByTestId('stage-content')).not.toBeEmpty();

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
