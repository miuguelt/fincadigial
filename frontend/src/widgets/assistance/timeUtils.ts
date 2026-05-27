export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return '';
  const diffMs = now - then;
  if (diffMs < 0) return 'Recién';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Hace unos segundos';
  if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  const months = Math.floor(days / 30);
  return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

export function isOverdue(dateStr: string | null | undefined, slaHours = 48): boolean {
  if (!dateStr) return false;
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return false;
  return (Date.now() - then) > slaHours * 3600000;
}

export function formatDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
