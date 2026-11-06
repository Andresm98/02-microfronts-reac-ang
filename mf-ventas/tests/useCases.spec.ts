import { describe, expect, it } from 'vitest';
import { createUseCases } from '../src/di';
import { VentaError } from '../src/domain';
import { FakeClientesLookup, FakeVentaGateway, makeVenta } from './fakes';

const setup = (ventas = new FakeVentaGateway(), clientes = new FakeClientesLookup()) => ({
  ventas,
  clientes,
  uc: createUseCases(ventas, clientes),
});

describe('casos de uso de ventas', () => {
  it('listar ventas filtra por cliente y ordena por fecha descendente', async () => {
    const { uc, ventas } = setup(
      new FakeVentaGateway([
        makeVenta({ id: 'a', clienteId: 'c1', fecha: '2026-01-01T00:00:00Z' }),
        makeVenta({ id: 'b', clienteId: 'c1', fecha: '2026-03-01T00:00:00Z' }),
        makeVenta({ id: 'c', clienteId: 'c2' }),
      ]),
    );
    const res = await uc.listarVentas.execute('c1');
    expect(res.map((v) => v.id)).toEqual(['b', 'a']);
    expect(ventas.listarCalls).toEqual(['c1']);
  });

  it('listar sin filtro no envía clienteId', async () => {
    const { uc, ventas } = setup();
    await uc.listarVentas.execute('');
    expect(ventas.listarCalls).toEqual([undefined]);
  });

  it('registrar venta normaliza y delega en el gateway', async () => {
    const { uc, ventas } = setup();
    const v = await uc.registrarVenta.execute({
      clienteId: 'c1',
      lineas: [{ producto: '  Té ', cantidad: 3, precioUnitario: 2.1 }],
    });
    expect(ventas.creadas[0].lineas[0].producto).toBe('Té');
    expect(v.total).toBe(6.3);
  });

  it('registrar venta rechaza datos inválidos sin llamar al gateway', async () => {
    const { uc, ventas } = setup();
    const err = await uc.registrarVenta
      .execute({ clienteId: '', lineas: [{ producto: '', cantidad: 0.5, precioUnitario: -1 }] })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(VentaError);
    const details = (err as VentaError).details as Record<string, unknown>;
    expect(details.clienteId).toBeDefined();
    expect(Object.keys((details.lineasDetalle as Record<number, object>)[0]).sort()).toEqual([
      'cantidad',
      'precioUnitario',
      'producto',
    ]);
    expect(ventas.creadas).toHaveLength(0);
  });

  it('registrar venta exige al menos una línea', async () => {
    const { uc } = setup();
    await expect(uc.registrarVenta.execute({ clienteId: 'c1', lineas: [] })).rejects.toMatchObject({ kind: 'validation' });
  });

  it('calcular total preview suma subtotales con redondeo y tolera campos vacíos', () => {
    const { uc } = setup();
    const p = uc.calcularTotalPreview.execute([
      { cantidad: 3, precioUnitario: 0.1 },
      { cantidad: 2, precioUnitario: 10.005 },
      { cantidad: NaN, precioUnitario: 5 },
    ]);
    expect(p.subtotales).toEqual([0.3, 20.01, 0]);
    expect(p.total).toBe(20.31);
  });

  it('listar clientes del lookup los ordena por nombre', async () => {
    const { uc } = setup(
      undefined,
      new FakeClientesLookup([
        { id: '2', nombre: 'Zoe', email: 'z@z.com' },
        { id: '1', nombre: 'Ana', email: 'a@a.com' },
      ]),
    );
    expect((await uc.listarClientes.execute()).map((c) => c.nombre)).toEqual(['Ana', 'Zoe']);
  });
});
