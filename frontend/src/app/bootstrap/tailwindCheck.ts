/** Development-only smoke check for the generated Tailwind stylesheet. */
export function scheduleTailwindCheck(): void {
  if (!import.meta.env.DEV) return;

  setTimeout(() => {
    const element = document.createElement('div');
    element.className = 'hidden bg-destructive';
    document.body.appendChild(element);
    const style = window.getComputedStyle(element);
    const active = style.display === 'none'
      || (Boolean(style.backgroundColor) && style.backgroundColor !== 'rgba(0, 0, 0, 0)');
    console.log('[TailwindCheck] active:', active, {
      display: style.display,
      background: style.backgroundColor,
    });
    element.remove();
  }, 0);
}
