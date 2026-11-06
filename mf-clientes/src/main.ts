import { mount } from './bootstrap';
import { subscribe, VENTA_CREADA, CLIENTE_SELECCIONADO } from './infrastructure/events/mfEvents';

// Entrada standalone: monta el micro en #app para desarrollarlo de forma aislada.
const el = document.getElementById('app');
if (el) mount(el);

if (import.meta.env.DEV) {
  subscribe(CLIENTE_SELECCIONADO, (d) => console.info('[mf_clientes] evento', CLIENTE_SELECCIONADO, d));
  subscribe(VENTA_CREADA, (d) => console.info('[mf_clientes] evento', VENTA_CREADA, d));
}
