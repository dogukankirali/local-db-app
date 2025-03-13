import { test, expect } from "@playwright/test";

test.describe("Update Anime", () => {
  test(`update existing animes' extra info`, async ({ browser }) => {
    // create a new todo locator
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });

    // Yeni bir sayfa oluşturun
    const page = await context.newPage();

    await page.goto("http://localhost:3008/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "screenshots/example.png" });

    const elements = await page.locator('td[id*="Genre"]');

    const pagination = await page.locator("li > button.MuiPaginationItem-page");
    const count = await pagination.count();
    if (count > 0) {
      const element = await pagination.nth(5);
      const lastPage = await element.textContent();
      if (lastPage !== null) {
        for (let i = 1; i <= parseInt(lastPage); i++) {
          if (i !== 1 || i !== parseInt(lastPage)) {
            const pageNum = await page.locator(
              `button[aria-label*="Go to page ${i}"]`
            );
            const pageCount = await pageNum.count();
            if (pageCount > 0) {
              const hey = pageNum.nth(0);
              const textContent = await hey.textContent();
              await page.waitForTimeout(500);
              console.log("textContent:", textContent);
              /* await page.screenshot({
                path: `screenshots/page-${parseInt(textContent!) + -1}.png`,
              }); */
              if (hey !== null) await hey.click();

              /*  for (let k = 0; k < count; k++) {
                const hey = pageNum.nth(k);
                const textContent = await hey.textContent();
                if (i.toString() === textContent) {
                  await page.screenshot({
                    path: `screenshots/page-${textContent}.png`,
                  });
                  if (pageNum !== null) await pageNum.click();
                }
                console.log(`Bulunan element sayısı: ${textContent}`);
              } */
            }
            //await page.screenshot({ path: `screenshots/page-${i}.png` });
            //if (pageNum !== null) await pageNum.click();
          }
          /* if (pageNum !== null) await pageNum.click();

          const count = await elements.count();
          console.log(`Bulunan element sayısı: ${count}`);

          for (let k = 0; k <= count; k++) {
            const element = elements.nth(k);
            const textContent = await element.textContent();
            if (textContent === null || textContent.trim() === "") {
              console.log("buldum", count);
            }
          } */
        }
      }
    }
  });
});

/* test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
}); */
