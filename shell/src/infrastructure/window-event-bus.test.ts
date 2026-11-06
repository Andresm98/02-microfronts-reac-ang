import { describe, expect, it, vi } from 'vitest';
import { WindowEventBus } from './window-event-bus';

describe('WindowEventBus', () => {
  it('entrega el detail de los CustomEvent emitidos por otros micros en window', () => {
    const bus = new WindowEventBus(window);
    const handler = vi.fn();
    const off = bus.on('clientes:seleccionado', handler);

    // Así emite un remote, sin conocer la shell:
    window.dispatchEvent(new CustomEvent('clientes:seleccionado', { detail: { id: '1', nombre: 'Ana' } }));

    expect(handler).toHaveBeenCalledWith({ id: '1', nombre: 'Ana' });
    off();
  });

  it('emit() despacha un CustomEvent observable con addEventListener', () => {
    const target = new EventTarget();
    const bus = new WindowEventBus(target);
    const listener = vi.fn();
    target.addEventListener('ventas:creada', listener);

    bus.emit('ventas:creada', { id: 'v1', clienteId: 'c1', total: 30 });

    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.detail).toEqual({ id: 'v1', clienteId: 'c1', total: 30 });
  });

  it('la función devuelta por on() desuscribe', () => {
    const bus = new WindowEventBus(new EventTarget());
    const handler = vi.fn();
    const off = bus.on('ventas:creada', handler);
    off();
    bus.emit('ventas:creada', { id: 'v1', clienteId: 'c1', total: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('no mezcla eventos distintos', () => {
    const bus = new WindowEventBus(new EventTarget());
    const handler = vi.fn();
    bus.on('clientes:seleccionado', handler);
    bus.emit('ventas:creada', { id: 'v1', clienteId: 'c1', total: 1 });
    expect(handler).not.toHaveBeenCalled();
  });
});
