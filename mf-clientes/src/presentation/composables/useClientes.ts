import { computed, inject, ref } from 'vue';
import type { ClientesUseCases } from '../../application/clientesUseCases';
import { ClienteError, type Cliente, type ClienteFieldErrors, type ClienteInput } from '../../domain';
import { USE_CASES_KEY, createUseCases } from '../../di';
import { publishClienteSeleccionado } from '../../infrastructure/events/mfEvents';

export type SaveResult = { ok: true; cliente: Cliente } | { ok: false; message: string; fieldErrors: ClienteFieldErrors };

function mensaje(e: unknown): string {
  if (e instanceof ClienteError) return e.message;
  return 'Ha ocurrido un error inesperado.';
}

export function useClientes(useCases?: ClientesUseCases) {
  const uc = useCases ?? inject(USE_CASES_KEY, null) ?? createUseCases();

  const clientes = ref<Cliente[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedId = ref<string | null>(null);
  const deletingId = ref<string | null>(null);

  const isEmpty = computed(() => !loading.value && !error.value && clientes.value.length === 0);

  async function cargar(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      clientes.value = await uc.listar.execute();
    } catch (e) {
      error.value = mensaje(e);
    } finally {
      loading.value = false;
    }
  }

  async function guardar(input: ClienteInput, id?: string): Promise<SaveResult> {
    try {
      const cliente = id ? await uc.actualizar.execute(id, input) : await uc.crear.execute(input);
      await cargar();
      return { ok: true, cliente };
    } catch (e) {
      const fieldErrors: ClienteFieldErrors = {};
      if (e instanceof ClienteError) {
        if (e.kind === 'duplicate') fieldErrors.email = e.message;
        if (e.kind === 'validation' && e.details && typeof e.details === 'object' && !Array.isArray(e.details)) {
          Object.assign(fieldErrors, e.details as ClienteFieldErrors);
        }
      }
      return { ok: false, message: mensaje(e), fieldErrors };
    }
  }

  async function eliminar(id: string): Promise<boolean> {
    deletingId.value = id;
    error.value = null;
    try {
      await uc.eliminar.execute(id);
      if (selectedId.value === id) selectedId.value = null;
      await cargar();
      return true;
    } catch (e) {
      error.value = mensaje(e);
      return false;
    } finally {
      deletingId.value = null;
    }
  }

  function seleccionar(cliente: Cliente): void {
    selectedId.value = cliente.id;
    publishClienteSeleccionado({ id: cliente.id, nombre: cliente.nombre });
  }

  return { clientes, loading, error, isEmpty, selectedId, deletingId, cargar, guardar, eliminar, seleccionar };
}
