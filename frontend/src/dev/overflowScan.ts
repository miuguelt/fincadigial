/**
 * Detector de desbordes — herramienta temporal de revisión (no se envía).
 *
 * Expone `window.__vlScan(root)` y devuelve tres listas:
 *   overflow     cajas cuyo contenido se sale horizontalmente
 *   brokenWords  palabras partidas a la mitad (viola el estándar de la casa)
 *   tiny         texto por debajo del suelo de legibilidad de 11 px
 */
export interface ScanResult {
  overflow: { sel: string; scroll: number; client: number; text: string }[];
  brokenWords: { word: string; sel: string; fs: string }[];
  tiny: { sel: string; fs: number; text: string }[];
}

function describe(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.body && parts.length < 5) {
    let s = node.tagName.toLowerCase();
    if (typeof node.className === 'string' && node.className.trim()) {
      s += '.' + node.className.trim().split(/\s+/).slice(0, 3).join('.');
    }
    parts.unshift(s);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

export function scanOverflow(root: HTMLElement = document.body): ScanResult {
  const out: ScanResult = { overflow: [], brokenWords: [], tiny: [] };
  const seen = new Set<string>();

  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const cs = getComputedStyle(el);
    // `hidden` incluye el recorte deliberado de `.fit-clamp`: no es un desborde
    // visible, y `auto`/`scroll` ofrecen su propia salida.
    if (cs.overflowX !== 'visible') return;
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
      out.overflow.push({
        sel: describe(el),
        scroll: el.scrollWidth,
        client: el.clientWidth,
        text: (el.innerText || '').slice(0, 40),
      });
    }
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    const parent = node.parentElement;
    if (!text || !text.trim() || !parent) continue;
    const cs = getComputedStyle(parent);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    for (const match of text.matchAll(/\S+/g)) {
      if (match[0].length < 4) continue;
      const range = document.createRange();
      range.setStart(node, match.index!);
      range.setEnd(node, match.index! + match[0].length);
      const tops = new Set<number>();
      for (const rect of range.getClientRects()) tops.add(Math.round(rect.top));
      if (tops.size > 1) {
        const key = describe(parent) + '|' + match[0];
        if (!seen.has(key)) {
          seen.add(key);
          out.brokenWords.push({ word: match[0], sel: describe(parent), fs: cs.fontSize });
        }
      }
    }
  }

  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
    if (!hasText) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11) out.tiny.push({ sel: describe(el), fs, text: (el.innerText || '').slice(0, 30) });
  });

  return out;
}

(window as any).__vlScan = scanOverflow;
