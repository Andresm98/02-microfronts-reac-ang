import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WindowEventBus } from '../../infrastructure/window-event-bus';
import { ServicesProvider } from '../services';
import { Header } from './Header';

function renderHeader() {
  const bus = new WindowEventBus(new EventTarget());
  render(
    <ServicesProvider services={{ bus, loader: { load: vi.fn() } }}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </ServicesProvider>,
  );
  return bus;
}

describe('Header', () => {
  it('muestra el cliente seleccionado al recibir clientes:seleccionado', () => {
    const bus = renderHeader();
    expect(screen.getByTestId('cliente-seleccionado')).toHaveTextContent('Ningún cliente seleccionado');

    act(() => bus.emit('clientes:seleccionado', { id: 'c1', nombre: 'Ana Pérez' }));
    expect(screen.getByTestId('cliente-seleccionado')).toHaveTextContent('Cliente: Ana Pérez');
  });

  it('muestra un toast temporal al recibir ventas:creada', () => {
    vi.useFakeTimers();
    try {
      const bus = renderHeader();
      act(() => bus.emit('ventas:creada', { id: 'v1', clienteId: 'c1', total: 125.5 }));
      expect(screen.getByText(/Venta registrada por/)).toHaveTextContent('125,50');

      act(() => vi.advanceTimersByTime(4100));
      expect(screen.queryByText(/Venta registrada por/)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
