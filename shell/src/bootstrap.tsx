import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { createModuleFederationLoader } from './infrastructure/module-federation-loader';
import { WindowEventBus } from './infrastructure/window-event-bus';
import { AppRoutes } from './presentation/AppRoutes';
import { ServicesProvider, type ShellServices } from './presentation/services';
import './styles.css';

// Composition root: aquí se eligen los adaptadores concretos.
const services: ShellServices = {
  loader: createModuleFederationLoader(),
  bus: new WindowEventBus(window),
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServicesProvider services={services}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ServicesProvider>
  </StrictMode>,
);
