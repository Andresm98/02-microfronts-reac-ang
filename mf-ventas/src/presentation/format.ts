const money = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

export const formatMoney = (n: number) => `$ ${money.format(n)}`;

export function formatFecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : date.format(d);
}
