import { expect, test } from '@playwright/test';

// Browsers do speech recognition themselves, so the tests swap in a stand-in that "hears"
// whatever window.__speech.say holds and records the language it was asked to listen in.
const fakeSpeech = (context) =>
  context.addInitScript(() => {
    window.__speech = { say: 'Paneer', heardIn: [], fail: null };
    window.SpeechRecognition = class {
      start() {
        window.__speech.heardIn.push(this.lang);
        setTimeout(() => {
          if (window.__speech.fail) {
            this.onerror?.({ error: window.__speech.fail });
          } else {
            const result = Object.assign([{ transcript: window.__speech.say }], { isFinal: true });
            this.onresult?.({ results: [result] });
          }
          this.onend?.();
        }, 50);
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    };
    window.webkitSpeechRecognition = window.SpeechRecognition;
  });

const assistant = (page) => page.getByRole('dialog', { name: 'Food assistant' });
const heardIn = (page) => page.evaluate(() => window.__speech.heardIn);

test('a spoken question is sent to the assistant', async ({ page, context }) => {
  await fakeSpeech(context);
  await page.goto('/');
  await page.getByRole('button', { name: 'Open food assistant' }).click();

  await assistant(page).getByRole('button', { name: 'Speak in English' }).click();
  await expect(assistant(page).locator('.chatMessage.from-user p')).toHaveText('Paneer');
  await expect(assistant(page).locator('.dish', { hasText: 'Paneer Thali' })).toBeVisible();
  expect(await heardIn(page)).toEqual(['en-IN']);

  // Switching to Hindi is remembered, and is what the browser is asked to listen for.
  await assistant(page)
    .getByRole('button', { name: /Voice language: English/ })
    .click();
  await expect(assistant(page).getByRole('button', { name: /Voice language: Hindi/ })).toHaveText(
    'हिं'
  );
  await page.evaluate(() => (window.__speech.say = 'कुछ मीठा चाहिए'));
  await assistant(page).getByRole('button', { name: 'Speak in Hindi' }).click();
  await expect(assistant(page).locator('.chatMessage.from-user p').last()).toHaveText(
    'कुछ मीठा चाहिए'
  );
  expect(await heardIn(page)).toEqual(['en-IN', 'hi-IN']);

  await page.reload();
  await page.getByRole('button', { name: 'Open food assistant' }).click();
  await expect(assistant(page).getByRole('button', { name: 'Speak in Hindi' })).toBeVisible();
});

test('a spoken search opens the results', async ({ page, context }) => {
  await fakeSpeech(context);
  await page.goto('/');
  await page.evaluate(() => (window.__speech.say = 'veg burger'));
  await page.locator('.featured').getByRole('button', { name: 'Speak in English' }).click();

  await expect(page).toHaveURL('/items?search=veg%20burger');
  await expect(page.locator('.itemCard', { hasText: 'Veg Burger' }).first()).toBeVisible();
});

test('a blocked microphone is explained, and nothing is sent', async ({ page, context }) => {
  await fakeSpeech(context);
  await page.goto('/');
  await page.evaluate(() => (window.__speech.fail = 'not-allowed'));
  await page.getByRole('button', { name: 'Open food assistant' }).click();
  await assistant(page).getByRole('button', { name: 'Speak in English' }).click();

  await expect(page.locator('.Toastify')).toContainText('The microphone is blocked');
  await expect(assistant(page).locator('.chatMessage')).toHaveCount(0);
  await expect(assistant(page).getByRole('button', { name: 'Speak in English' })).toBeVisible();
});

test('browsers without speech recognition show no microphone', async ({ page, context }) => {
  await context.addInitScript(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });
  await page.goto('/');
  await expect(page.locator('.featured .searchInput input')).toBeVisible();
  await expect(page.locator('.micButton')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open food assistant' }).click();
  await expect(assistant(page).getByRole('button', { name: 'Send' })).toBeVisible();
  await expect(assistant(page).locator('.micButton')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the microphone fits next to the search box and in the assistant', async ({
    page,
    context,
  }) => {
    await fakeSpeech(context);
    await page.goto('/');
    await expect(page.locator('.featured .micButton')).toBeVisible();
    // The Search button is still fully on screen next to it.
    const search = await page.locator('.featured .search > button').boundingBox();
    expect(search.x + search.width).toBeLessThanOrEqual(390);
    await page.getByRole('button', { name: 'Open food assistant' }).click();
    await expect(assistant(page).locator('.micButton')).toBeVisible();
    await expect(assistant(page).getByRole('button', { name: 'Send' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
