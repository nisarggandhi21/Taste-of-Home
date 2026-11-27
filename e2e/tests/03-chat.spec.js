import { expect, test } from "@playwright/test";
import { BUYER, SELLER, login, loginInNewContext } from "./helpers.js";

const openConversation = async (buyerPage, sellerPage) => {
  await buyerPage.goto("/messages");
  const path = await buyerPage
    .locator("tbody a.link")
    .first()
    .getAttribute("href");
  await sellerPage.goto(path);
  await buyerPage.goto(path);
  await expect(sellerPage.locator(".messages .item").first()).toBeVisible();
  await expect(buyerPage.locator(".messages .item").first()).toBeVisible();
};

const send = async (page, text) => {
  await page.fill(".write textarea", text);
  await page.click(".write button");
};

test("a message reaches the other person live", async ({ page, browser }) => {
  await login(page, BUYER);
  const seller = await loginInNewContext(browser, SELLER);
  await openConversation(page, seller.page);

  const text = `live message ${Date.now()}`;
  await send(page, text);

  // Well under the 5 second polling fallback, so this can only have arrived over the live
  // connection.
  await expect(
    seller.page.locator(".messages .item p", { hasText: text }),
  ).toHaveCount(1, {
    timeout: 2500,
  });
  await seller.context.close();
});

test("chat still updates when live connections are unavailable", async ({
  page,
  browser,
}) => {
  // For example behind a proxy that does not pass long-lived responses on.
  const blockStream = (context) =>
    context.route("**/messages/stream", (route) => route.abort());
  await blockStream(page.context());
  await login(page, BUYER);
  const seller = await loginInNewContext(browser, SELLER, blockStream);
  await openConversation(page, seller.page);

  const text = `polled message ${Date.now()}`;
  await send(page, text);

  await expect(
    seller.page.locator(".messages .item p", { hasText: text }),
  ).toHaveCount(1, {
    timeout: 9000,
  });
  await seller.context.close();
});

test("chat stays live after the server ends a connection", async ({
  page,
  browser,
}) => {
  // On Vercel every connection is ended after 50 seconds and the browser opens the next one.
  // The test server does the same after 8 seconds.
  await login(page, BUYER);
  const seller = await loginInNewContext(browser, SELLER);
  await openConversation(page, seller.page);
  const reconnected = seller.page.waitForRequest("**/messages/stream", {
    timeout: 15000,
  });
  await reconnected;

  const text = `after reconnect ${Date.now()}`;
  await send(page, text);
  await expect(
    seller.page.locator(".messages .item p", { hasText: text }),
  ).toHaveCount(1, {
    timeout: 2500,
  });
  await seller.context.close();
});

test("the list of conversations updates as a message arrives", async ({
  page,
  browser,
}) => {
  await login(page, BUYER);
  const seller = await loginInNewContext(browser, SELLER);
  await seller.page.goto("/messages");
  await expect(seller.page.locator(".messages tbody tr").first()).toBeVisible();

  await page.goto("/messages");
  await page.locator("tbody a.link").first().click();
  const text = `list update ${Date.now()}`;
  await send(page, text);

  const row = seller.page.locator(".messages tbody tr", { hasText: text });
  await expect(row).toHaveCount(1, { timeout: 2500 });
  await expect(row).toHaveClass(/active/);
  await seller.context.close();
});
