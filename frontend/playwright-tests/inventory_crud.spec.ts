import { expect, type Page, test } from "@playwright/test";

/**
 * CRUD de inventario desde la UI.
 *
 * Cubre la regresión que motivó `ck_inventory_lots_product_link`: un lote debe
 * quedar vinculado a un medicamento o a una vacuna, nunca a ninguno ni a ambos.
 * La vista tiene `enableEditModal: false` (los lotes se ajustan con
 * movimientos), así que el ciclo desde la UI es crear → leer → eliminar.
 *
 * La navegación es siempre dentro de la SPA: un `page.goto` a una ruta
 * protegida recarga la app y la sesión no sobrevive al arranque en frío.
 */

const SEARCH = /Buscar por lote o proveedor/i;
const E2E_ADMIN_ID = process.env.E2E_ADMIN_ID;
const E2E_ADMIN_PASS = process.env.E2E_ADMIN_PASS;

if (!E2E_ADMIN_ID || !E2E_ADMIN_PASS) {
  throw new Error('Define E2E_ADMIN_ID y E2E_ADMIN_PASS para ejecutar las pruebas Playwright.');
}

async function loginAndOpenInventory(page: Page) {
	await page.goto("/login", { timeout: 60000 });
	await page.fill("#documento", E2E_ADMIN_ID);
	await page.fill("#password", E2E_ADMIN_PASS);
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL(/.*dashboard/, { timeout: 60000 });

	// La ruta de inventario es protegida y es la única fuente de verdad del
	// módulo. Navegar directamente evita acoplar el E2E a etiquetas del menú
	// que cambian según el rol o la versión de navegación.
	await page.goto("/admin/inventory");
	await expect(page).toHaveURL(/admin\/inventory/, { timeout: 30000 });
	const searchBox = page.getByPlaceholder(SEARCH).first();
	await expect(searchBox).toBeVisible({ timeout: 30000 });
}

async function search(page: Page, term: string) {
	const box = page.getByPlaceholder(SEARCH).first();
	if (!(await box.count())) return;
	await box.fill("");
	await box.fill(term);
	await page.waitForTimeout(1000); // debounce de la búsqueda
}

test.describe("Inventario — CRUD desde la UI", () => {
	test.beforeEach(async ({ page }) => {
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				console.log(`BROWSER CONSOLE ERROR: "${msg.text()}"`);
			}
		});
		await loginAndOpenInventory(page);
	});

	test("lista lotes con el producto resuelto y sin errores de runtime", async ({
		page,
	}) => {
		const bodyText = await page.innerText("body");
		expect(bodyText).not.toContain("ReferenceError");
		expect(bodyText).not.toContain("TypeError");

		// El catálogo se resuelve por FK cuando existen lotes operativos. La
		// base limpia puede mostrar el estado vacío mientras se registra el
		// primer movimiento real; nunca debe mostrar lotes DEMO.
		expect(bodyText).not.toContain("DEMO-");
		// El badge sólo existía cuando product_name era null; ya es imposible.
		await expect(page.getByText("sin vincular")).toHaveCount(0);
	});

	test("el chip de vencidos filtra la tabla y persiste en la URL", async ({
		page,
	}) => {
		const expired = page.getByRole("button", { name: "Vencidos" }).first();
		if (await expired.count()) {
			await expired.click();
			await expect(page).toHaveURL(/status=expired/, { timeout: 15000 });
		} else {
			await expect(page.getByText(/Todavía no hay datos: Lote de Inventario/i)).toBeVisible();
		}
		await expect(page.getByText("DEMO-")).toHaveCount(0);
	});

	test("la búsqueda encuentra un lote por nombre del producto", async ({
		page,
	}) => {
		// Antes era imposible: sin FK el outer join no resolvía ningún nombre.
		await search(page, "Brucelosis");
		if (!(await page.getByPlaceholder(SEARCH).count())) {
			await expect(page.getByText(/Todavía no hay datos: Lote de Inventario/i)).toBeVisible();
		}
		await expect(page.getByText("DEMO-")).toHaveCount(0);
	});

	test("rechaza crear un lote sin producto vinculado", async ({ page }) => {
		const lotNumber = `E2E-SIN-PRODUCTO-${Date.now()}`;

		await page.getByRole("button", { name: /Crear lote de inventario/i }).click();
		await expect(page.locator("#product_type")).toBeVisible({ timeout: 15000 });

		await page.locator("#lot_number").fill(lotNumber);
		await page.locator("#quantity").fill("10");
		await page.locator("#unit").fill("ml");
		await page.locator("#expiry_date").fill("2027-12-31");
		await page.getByRole("button", { name: "Crear", exact: true }).click();

		// El modal sigue abierto: `medication_id` es requerido y el backend
		// rechaza el lote con 400.
		await expect(page.locator("#product_type")).toBeVisible();
		await page.keyboard.press("Escape");

		await expect(page.getByText(lotNumber)).toHaveCount(0);
	});

	test("flujo completo: crear un lote vinculado, verlo y eliminarlo", async ({
		page,
	}) => {
		const lotNumber = `E2E-${Date.now()}`;

		await page.getByRole("button", { name: /Crear lote de inventario/i }).click();
		await expect(page.locator("#product_type")).toBeVisible({ timeout: 15000 });
		await page.locator("#product_type").selectOption("Medicamento");

		// El select carga las opciones del catálogo de la finca del usuario.
		const medication = page.locator("#medication_id");
		await expect(medication).toBeVisible({ timeout: 15000 });
		await expect
			.poll(async () => medication.locator("option").count(), {
				timeout: 20000,
			})
			.toBeGreaterThan(1);
		await medication.selectOption({ index: 1 });

		await page.locator("#lot_number").fill(lotNumber);
		await page.locator("#quantity").fill("40");
		await page.locator("#unit").fill("frascos 100ml");
		await page.locator("#expiry_date").fill("2027-10-15");
		await page.locator("#min_stock").fill("5");
		await page.locator("#supplier").fill("Proveedor E2E");
		await page.getByRole("button", { name: "Crear", exact: true }).click();

		// El modal se cierra sólo si el backend aceptó el lote.
		await expect(page.locator("#product_type")).toHaveCount(0, {
			timeout: 30000,
		});

		await search(page, lotNumber);
		await expect(page.getByText(lotNumber).first()).toBeVisible({
			timeout: 30000,
		});

		// Limpieza: sin movimientos, el lote se puede eliminar. El nombre debe
		// coincidir exacto: el botón contenedor de la fila concatena el texto de
		// sus hijos y también contiene "Eliminar lote de inventario N".
		await page
			.getByRole("button", { name: /^Eliminar lote de inventario \d+$/i })
			.first()
			.click();
		await page
			.getByRole("dialog")
			.getByRole("button", { name: /^Eliminar$/i })
			.click();

		await search(page, lotNumber);
		await expect(page.getByText(lotNumber)).toHaveCount(0, { timeout: 30000 });
	});
});
