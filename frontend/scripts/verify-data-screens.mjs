// Verificación del estándar de pantallas de datos: alto aprovechado, barras
// flotantes sin coste de layout, arrastre y accesibilidad del contenido.
import { chromium } from 'playwright';

const DEST = process.argv[2] || 'verify.png';
const fallos = [];
const check = (nombre, ok, detalle) => {
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? ' -> ' + detalle : ''}`);
  if (!ok) fallos.push(`${nombre}: ${detalle}`);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 700 } });

let ok = false;
for (let i = 1; i <= 3 && !ok; i++) {
  try {
    await page.goto('http://localhost:3005/login', { waitUntil: 'domcontentloaded' });
    await page.getByText('Admin', { exact: true }).first().click({ timeout: 8000 });
    await page.waitForFunction(() => {
      const id = document.querySelector('input[name="identifier"]');
      const pw = document.querySelector('input[name="password"]');
      return id && pw && id.value.length >= 4 && pw.value.length >= 4;
    }, { timeout: 12000 });
    await page.waitForTimeout(700);
    if (page.url().includes('login')) await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|admin/, { timeout: 15000 });
    ok = true;
  } catch (e) {
    console.log('login intento', i, 'falló:', String(e).split('\n')[0]);
  }
}
if (!ok) { console.log('NO SE PUDO ENTRAR'); await browser.close(); process.exit(2); }

const errores = [];
page.on('pageerror', (e) => errores.push(String(e).slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)); });

const abrir = async (ruta) => {
  await page.goto(`http://localhost:3005${ruta}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.no-native-scrollbar', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1800);
};

// ─── 1. Alto y barras en una tabla estrecha ────────────────────────────────
await abrir('/admin/tasks');
let m = await page.evaluate(() => {
  const sc = document.querySelector('.no-native-scrollbar');
  const r = sc.getBoundingClientRect();
  return {
    muerto: Math.round(window.innerHeight - r.bottom),
    pistaV: sc.offsetWidth - sc.clientWidth,
    pistaH: sc.offsetHeight - sc.clientHeight,
    desborda: sc.scrollHeight > sc.clientHeight,
    pulgares: document.querySelectorAll('.floating-scroll-thumb').length,
    anchoTabla: Math.round(document.querySelector('table').getBoundingClientRect().width),
    anchoCaja: Math.round(r.width),
  };
});
console.log('tasks:', JSON.stringify(m));
check('espacio muerto bajo la tabla <= 12px', m.muerto <= 12, `${m.muerto}px`);
check('barra nativa no reserva pista', m.pistaV === 0 && m.pistaH === 0, `V=${m.pistaV} H=${m.pistaH}`);
check('pulgar flotante presente al desbordar', m.desborda && m.pulgares >= 1, `pulgares=${m.pulgares}`);
check('tabla llena el ancho de la caja', Math.abs(m.anchoTabla - m.anchoCaja) <= 2, `tabla=${m.anchoTabla} caja=${m.anchoCaja}`);

// ─── 2. El pulgar vertical se arrastra ─────────────────────────────────────
const thumb = await page.evaluate(() => {
  const t = document.querySelectorAll('.floating-scroll-thumb')[0].parentElement;
  const b = t.getBoundingClientRect();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
});
await page.mouse.move(thumb.x, thumb.y);
await page.mouse.down();
await page.mouse.move(thumb.x, thumb.y + 200, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(400);
const trasArrastre = await page.evaluate(() => {
  const sc = document.querySelector('.no-native-scrollbar');
  return { top: Math.round(sc.scrollTop), max: Math.round(sc.scrollHeight - sc.clientHeight) };
});
check('arrastrar el pulgar desplaza la tabla', trasArrastre.top > 50, `scrollTop=${trasArrastre.top}`);

// ─── 3. La última fila es alcanzable, no la tapa la paginación ─────────────
await page.evaluate(() => {
  const sc = document.querySelector('.no-native-scrollbar');
  sc.scrollTop = sc.scrollHeight;
});
await page.waitForTimeout(500);
const ultima = await page.evaluate(() => {
  const filas = document.querySelectorAll('tbody tr');
  const f = filas[filas.length - 1];
  const b = f.getBoundingClientRect();
  const cx = b.x + 60;
  const cy = b.y + b.height / 2;
  const encima = document.elementFromPoint(cx, cy);
  return {
    visible: b.bottom <= window.innerHeight + 1 && b.top >= 0,
    tapada: !f.contains(encima) && encima !== f,
    quien: encima ? (encima.className || '').toString().slice(0, 50) : 'nada',
  };
});
check('última fila visible al final del scroll', ultima.visible, JSON.stringify(ultima));
check('última fila no tapada por la barra flotante', !ultima.tapada, ultima.quien);

// ─── 4. El pulgar no roba clics a las celdas ───────────────────────────────
const clicable = await page.evaluate(() => {
  const sc = document.querySelector('.no-native-scrollbar');
  const r = sc.getBoundingClientRect();
  // Punto justo a la izquierda del pulgar, dentro de la última columna.
  const el = document.elementFromPoint(r.right - 30, r.top + 120);
  return el ? el.tagName + '.' + (el.className || '').toString().slice(0, 40) : 'nada';
});
check('el contenido bajo el pulgar sigue recibiendo el puntero', !clicable.includes('floating-scroll-thumb'), clicable);

await page.screenshot({ path: DEST });

// ─── 5. Tabla ancha: pulgar horizontal y arrastre ──────────────────────────
await abrir('/admin/vaccinations');
const h = await page.evaluate(() => {
  const sc = document.querySelector('.no-native-scrollbar');
  const t = document.querySelectorAll('.floating-scroll-thumb')[1];
  const b = t ? t.parentElement.getBoundingClientRect() : null;
  return {
    desbordaH: sc.scrollWidth > sc.clientWidth,
    pulgar: b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null,
    pistaH: sc.offsetHeight - sc.clientHeight,
  };
});
check('tabla ancha desborda en horizontal', h.desbordaH, String(h.desbordaH));
check('pulgar horizontal presente', !!h.pulgar, h.pulgar ? 'sí' : 'no');
check('barra horizontal nativa no reserva pista', h.pistaH === 0, `${h.pistaH}px`);
if (h.pulgar) {
  await page.mouse.move(h.pulgar.x, h.pulgar.y);
  await page.mouse.down();
  await page.mouse.move(h.pulgar.x + 220, h.pulgar.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const left = await page.evaluate(() => Math.round(document.querySelector('.no-native-scrollbar').scrollLeft));
  check('arrastrar el pulgar horizontal desplaza la tabla', left > 50, `scrollLeft=${left}`);
}
await page.screenshot({ path: DEST.replace('.png', '-ancha.png') });

// ─── 6. Modo oscuro ────────────────────────────────────────────────────────
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.waitForTimeout(500);
const oscuro = await page.evaluate(() => {
  const t = document.querySelector('.floating-scroll-thumb');
  return t ? getComputedStyle(t).backgroundColor : 'sin pulgar';
});
check('el pulgar tiene color en modo oscuro', oscuro !== 'rgba(0, 0, 0, 0)' && oscuro !== 'sin pulgar', oscuro);
await page.screenshot({ path: DEST.replace('.png', '-oscuro.png') });
await page.evaluate(() => document.documentElement.classList.remove('dark'));

// ─── 7. 320 px ─────────────────────────────────────────────────────────────
await page.setViewportSize({ width: 320, height: 700 });
await abrir('/admin/tasks');
const movil = await page.evaluate(() => {
  const sc = document.querySelector('.no-native-scrollbar');
  const r = sc.getBoundingClientRect();
  // La píldora es el `.fixed` que contiene el texto de página; hay otros
  // elementos fijos con el mismo z-index (acciones rápidas, chat).
  const pildora = Array.from(document.querySelectorAll('.fixed'))
    .find((n) => (n.textContent || '').includes('Pág.'));
  // Un nodo de texto sin hijos que mide más de 26 px de alto es texto partido.
  const partidos = pildora
    ? Array.from(pildora.querySelectorAll('span, div')).filter((n) => {
        const b = n.getBoundingClientRect();
        return b.height > 26 && n.children.length === 0 && (n.textContent || '').trim();
      }).length
    : -1;
  return {
    muerto: Math.round(window.innerHeight - r.bottom),
    desbordeHorizontalDeLaPagina: document.documentElement.scrollWidth > window.innerWidth,
    pistaV: sc.offsetWidth - sc.clientWidth,
    pulgares: document.querySelectorAll('.floating-scroll-thumb').length,
    altoPildora: pildora ? Math.round(pildora.getBoundingClientRect().height) : null,
    textosPartidos: partidos,
  };
});
console.log('320px:', JSON.stringify(movil));
check('320px sin espacio muerto', movil.muerto <= 12, `${movil.muerto}px`);
check('320px sin desbordamiento horizontal de la página', !movil.desbordeHorizontalDeLaPagina, String(movil.desbordeHorizontalDeLaPagina));
check('320px ningún texto de la paginación se parte', movil.textosPartidos === 0, `${movil.textosPartidos} nodos partidos, píldora ${movil.altoPildora}px`);
await page.screenshot({ path: DEST.replace('.png', '-320.png') });

console.log('\nERRORES DE CONSOLA:', errores.length ? [...new Set(errores)].slice(0, 8) : 'ninguno');
console.log(fallos.length ? `\n${fallos.length} COMPROBACIONES FALLIDAS` : '\nTODAS LAS COMPROBACIONES PASAN');
await browser.close();
process.exit(fallos.length ? 1 : 0);
