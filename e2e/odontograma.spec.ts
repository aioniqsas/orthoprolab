import { expect, test } from "@playwright/test";

const DIENTES = 32;

async function leerCajas(page: import("@playwright/test").Page) {
  const botones = page.getByRole("button", { name: /^Diente \d+$/ });
  await expect(botones).toHaveCount(DIENTES);
  const cajas: { numero: string; x: number; y: number; width: number; height: number }[] = [];
  for (let i = 0; i < DIENTES; i++) {
    const caja = await botones.nth(i).boundingBox();
    expect(caja, "cada diente debe tener caja").not.toBeNull();
    cajas.push({ numero: (await botones.nth(i).getAttribute("aria-label")) ?? "", ...caja! });
  }
  return cajas;
}

test("cada diente queda clickeable en el molde", async ({ page }) => {
  await page.goto("/preview/odontograma");
  const cajas = await leerCajas(page);

  expect(cajas).toHaveLength(DIENTES);
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const a = cajas[i]!;
      const b = cajas[j]!;
      // Los dientes van pegados, pero ningún centro puede quedar tapado.
      const centroTapado =
        a.x + a.width / 2 > b.x &&
        a.x + a.width / 2 < b.x + b.width &&
        a.y + a.height / 2 > b.y &&
        a.y + a.height / 2 < b.y + b.height;
      expect(centroTapado, `${a.numero} queda debajo de ${b.numero}`).toBe(false);
    }
  }
});

test("el molde entra en el ancho visible, sin scroll horizontal", async ({ page }) => {
  await page.goto("/preview/odontograma");
  await leerCajas(page);

  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);
});

test("cada tipo de diente tiene su forma", async ({ page }) => {
  await page.goto("/preview/odontograma");

  const forma = async (numero: number) =>
    page.getByRole("button", { name: `Diente ${numero}`, exact: true }).evaluate((el) => ({
      width: Math.round(el.getBoundingClientRect().width),
      corona: el.querySelector("path")?.getAttribute("d") ?? "",
    }));

  // Molar más ancho que incisivo, y premolar distinto de ambos.
  const incisivo = await forma(12);
  const premolar = await forma(14);
  const molar = await forma(17);

  expect(molar.width).toBeGreaterThan(premolar.width);
  expect(premolar.width).toBeGreaterThan(incisivo.width);
  // Cada tipo dibuja una corona distinta.
  expect(incisivo.corona).not.toBe(molar.corona);
  expect(premolar.corona).not.toBe(molar.corona);

  await page.screenshot({
    path: `e2e/.results/odontograma-${test.info().project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Diente 11", exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]")
    .screenshot({ path: `e2e/.results/mold-${test.info().project.name}.png` });
});
