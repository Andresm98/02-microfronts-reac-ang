import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUseCases } from '../src/di';
import { CLIENTE_SELECCIONADO, publish, subscribe, VENTA_CREADA } from '../src/infrastructure/events/mfEvents';
import { UseCasesProvider } from '../src/presentation/UseCasesContext';
import { VentasApp } from '../src/presentation/VentasApp';
import { mount as mountMf, unmount as unmountMf } from '../src/bootstrap';
import { FakeClientesLookup, FakeVentaGateway, makeVenta } from './fakes';

const clientes = [
  { id: 'c1', nombre: 'Ana', email: 'ana@a.com' },
  { id: 'c2', nombre: 'Luis', email: 'luis@a.com' },
];

function setup(ventas = new FakeVentaGateway()) {
  const uc = createUseCases(ventas, new FakeClientesLookup(clientes));
  render(
    <UseCasesProvider value={uc}>
      <VentasApp />
    </UseCasesProvider>,
  );
  return { ventas };
}

afterEach(cleanup);

describe('VentasApp', () => {
  it('muestra el estado vacío y luego las ventas con nombre de cliente', async () => {
    setup(new FakeVentaGateway([makeVenta({ id: 'v1', clienteId: 'c2', total: 3 })]));
    expect(await screen.findByText('Luis', { selector: 'td' })).toBeTruthy();
  });

  it('calcula el total en vivo al añadir líneas', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('Aún no hay ventas registradas.');

    await user.type(screen.getByLabelText('Producto línea 1'), 'Café');
    await user.clear(screen.getByLabelText('Cantidad línea 1'));
    await user.type(screen.getByLabelText('Cantidad línea 1'), '2');
    await user.type(screen.getByLabelText('Precio línea 1'), '1.5');
    await user.click(screen.getByRole('button', { name: '+ Añadir línea' }));
    await user.type(screen.getByLabelText('Producto línea 2'), 'Té');
    await user.type(screen.getByLabelText('Precio línea 2'), '4');

    expect(screen.getAllByTestId('linea')).toHaveLength(2);
    expect(screen.getByTestId('total-preview').textContent).toMatch(/7,00/);

    await user.click(screen.getByRole('button', { name: 'Quitar línea 2' }));
    expect(screen.getByTestId('total-preview').textContent).toMatch(/3,00/);
  });

  it('valida el formulario antes de enviar', async () => {
    const user = userEvent.setup();
    const { ventas } = setup();
    await screen.findByText('Aún no hay ventas registradas.');
    await user.click(screen.getByRole('button', { name: 'Registrar venta' }));
    expect(screen.getByText('Selecciona un cliente.')).toBeTruthy();
    expect(screen.getByText('Producto obligatorio.')).toBeTruthy();
    expect(ventas.creadas).toHaveLength(0);
  });

  it('escucha clientes:seleccionado, filtra y precarga; al crear emite ventas:creada', async () => {
    const user = userEvent.setup();
    const creada = vi.fn();
    const off = subscribe(VENTA_CREADA, creada);
    const { ventas } = setup(new FakeVentaGateway([makeVenta({ clienteId: 'c2' })]));
    await screen.findByText('Luis', { selector: 'td' });
    await waitFor(() => expect(screen.getAllByRole('option', { name: /Ana/ }).length).toBeGreaterThan(0));

    act(() => publish(CLIENTE_SELECCIONADO, { id: 'c1', nombre: 'Ana' }));

    await screen.findByText('Este cliente aún no tiene ventas.');
    expect(ventas.listarCalls.at(-1)).toBe('c1');
    const form = screen.getByRole('form', { name: 'Registrar venta' });
    expect((within(form).getByRole('combobox') as HTMLSelectElement).value).toBe('c1');

    await user.type(screen.getByLabelText('Producto línea 1'), 'Pan');
    await user.type(screen.getByLabelText('Precio línea 1'), '2.5');
    await user.click(screen.getByRole('button', { name: 'Registrar venta' }));

    await waitFor(() => expect(creada).toHaveBeenCalledWith({ id: 'v1', clienteId: 'c1', total: 2.5 }));
    expect(await screen.findByText('Pan ×1')).toBeTruthy();
    off();
  });
});

describe('bootstrap mount/unmount', () => {
  it('monta y desmonta en elementos independientes', async () => {
    const uc = createUseCases(new FakeVentaGateway(), new FakeClientesLookup());
    const a = document.createElement('div');
    const b = document.createElement('div');
    await act(async () => {
      mountMf(a, {}, uc);
      mountMf(b, {}, uc);
    });
    expect(a.textContent).toContain('Ventas');
    expect(b.textContent).toContain('Ventas');
    act(() => unmountMf(a));
    expect(a.innerHTML).toBe('');
    expect(b.textContent).toContain('Ventas');
    act(() => unmountMf(b));
  });
});
