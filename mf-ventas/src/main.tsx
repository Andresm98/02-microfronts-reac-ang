import { mount } from './bootstrap';
import { subscribe, VENTA_CREADA } from './infrastructure/events/mfEvents';

// Entrada standalone: monta el micro en #root para desarrollarlo de forma aislada.
const el = document.getElementById('root');
if (el) mount(el);

if (import.meta.env.DEV) {
  subscribe(VENTA_CREADA, (d) => console.info('[mf_ventas] evento', VENTA_CREADA, d));
}
