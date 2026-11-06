import { describe, expect, it } from 'vitest';
import { ClienteError } from '../src/domain';
import { createUseCases } from '../src/di';
import { FakeClienteGateway, makeCliente } from './fakes';

describe('casos de uso de clientes', () => {
  it('listar devuelve los clientes ordenados por nombre', async () => {
    const gw = new FakeClienteGateway([makeCliente({ nombre: 'Zoe' }), makeCliente({ nombre: 'Ana' })]);
    const uc = createUseCases(gw);
    const res = await uc.listar.execute();
    expect(res.map((c) => c.nombre)).toEqual(['Ana', 'Zoe']);
  });

  it('crear normaliza los datos antes de llamar al gateway', async () => {
    const gw = new FakeClienteGateway();
    const uc = createUseCases(gw);
    const c = await uc.crear.execute({ nombre: '  Luis ', email: ' LUIS@Mail.com ', documento: ' 9 ', telefono: '  ' });
    expect(c).toMatchObject({ nombre: 'Luis', email: 'luis@mail.com', documento: '9', telefono: null });
  });

  it('crear rechaza datos inválidos sin llamar al gateway', async () => {
    const gw = new FakeClienteGateway();
    const uc = createUseCases(gw);
    const err = await uc.crear.execute({ nombre: '', email: 'no-email', documento: '' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ClienteError);
    expect((err as ClienteError).kind).toBe('validation');
    expect(Object.keys((err as ClienteError).details as object).sort()).toEqual(['documento', 'email', 'nombre']);
    expect(gw.calls).toEqual([]);
  });

  it('crear propaga el error de email duplicado', async () => {
    const gw = new FakeClienteGateway([makeCliente({ email: 'ana@correo.com' })]);
    const uc = createUseCases(gw);
    await expect(
      uc.crear.execute({ nombre: 'Ana', email: 'ana@correo.com', documento: '1' }),
    ).rejects.toMatchObject({ kind: 'duplicate' });
  });

  it('actualizar modifica el cliente existente', async () => {
    const c = makeCliente({ id: 'c1' });
    const gw = new FakeClienteGateway([c]);
    const uc = createUseCases(gw);
    const res = await uc.actualizar.execute('c1', { nombre: 'Ana María', email: c.email, documento: '1', telefono: '600123123' });
    expect(res.nombre).toBe('Ana María');
    expect(res.telefono).toBe('600123123');
  });

  it('eliminar quita el cliente y falla si no existe', async () => {
    const gw = new FakeClienteGateway([makeCliente({ id: 'c1' })]);
    const uc = createUseCases(gw);
    await uc.eliminar.execute('c1');
    expect(gw.clientes).toHaveLength(0);
    await expect(uc.eliminar.execute('c1')).rejects.toMatchObject({ kind: 'not-found' });
  });
});
