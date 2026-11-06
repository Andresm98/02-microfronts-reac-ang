import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUseCases } from '../src/di';
import { CLIENTE_SELECCIONADO, subscribe } from '../src/infrastructure/events/mfEvents';
import ClientesApp from '../src/presentation/ClientesApp.vue';
import { mount as mountMf, unmount as unmountMf } from '../src/bootstrap';
import { FakeClienteGateway, makeCliente } from './fakes';

const offs: (() => void)[] = [];
afterEach(() => offs.splice(0).forEach((off) => off()));

async function render(gw: FakeClienteGateway) {
  const wrapper = mount(ClientesApp, { props: { useCases: createUseCases(gw) } });
  await flushPromises();
  return wrapper;
}

describe('ClientesApp', () => {
  it('muestra el estado vacío cuando no hay clientes', async () => {
    const w = await render(new FakeClienteGateway());
    expect(w.find('[data-state="empty"]').exists()).toBe(true);
  });

  it('lista clientes y al seleccionar emite el evento y resalta la fila', async () => {
    const handler = vi.fn();
    offs.push(subscribe(CLIENTE_SELECCIONADO, handler));
    const w = await render(new FakeClienteGateway([makeCliente({ id: 'c1', nombre: 'Ana' })]));

    expect(w.findAll('tbody tr')).toHaveLength(1);
    await w.find('[data-action="select"]').trigger('click');

    expect(handler).toHaveBeenCalledWith({ id: 'c1', nombre: 'Ana' });
    expect(w.find('tr[data-id="c1"]').classes()).toContain('selected');
  });

  it('valida el formulario y muestra el error 409 de email duplicado', async () => {
    const w = await render(new FakeClienteGateway([makeCliente({ email: 'ana@correo.com' })]));

    await w.find('form').trigger('submit');
    expect(w.find('[data-error="nombre"]').exists()).toBe(true);

    await w.find('input[name="nombre"]').setValue('Otra Ana');
    await w.find('input[name="email"]').setValue('ana@correo.com');
    await w.find('input[name="documento"]').setValue('999');
    await w.find('form').trigger('submit');
    await flushPromises();

    expect(w.find('[data-error="email"]').text()).toContain('Ya existe un cliente con ese email');
    expect(w.find('[role="alert"]').exists()).toBe(true);
  });

  it('crea un cliente y lo añade a la tabla', async () => {
    const w = await render(new FakeClienteGateway());
    await w.find('input[name="nombre"]').setValue('Luis');
    await w.find('input[name="email"]').setValue('luis@correo.com');
    await w.find('input[name="documento"]').setValue('42');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.text()).toContain('luis@correo.com');
  });

  it('elimina tras confirmar', async () => {
    const gw = new FakeClienteGateway([makeCliente({ id: 'c1' })]);
    const w = await render(gw);
    await w.find('[data-action="delete"]').trigger('click');
    await w.find('[data-action="confirm-delete"]').trigger('click');
    await flushPromises();
    expect(gw.clientes).toHaveLength(0);
    expect(w.find('[data-state="empty"]').exists()).toBe(true);
  });
});

describe('bootstrap mount/unmount', () => {
  it('monta y desmonta en elementos independientes', () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
    const a = document.createElement('div');
    const b = document.createElement('div');
    mountMf(a);
    mountMf(b);
    expect(a.querySelector('.mfc')).not.toBeNull();
    expect(b.querySelector('.mfc')).not.toBeNull();
    unmountMf(a);
    expect(a.innerHTML).toBe('');
    expect(b.querySelector('.mfc')).not.toBeNull();
    unmountMf(b);
    vi.unstubAllGlobals();
  });
});
