<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { ClientesUseCases } from '../application/clientesUseCases';
import type { Cliente } from '../domain';
import ClienteForm from './components/ClienteForm.vue';
import ClientesTable from './components/ClientesTable.vue';
import { useClientes } from './composables/useClientes';

const props = defineProps<{ useCases?: ClientesUseCases; basePath?: string }>();

const { clientes, loading, error, isEmpty, selectedId, deletingId, cargar, guardar, eliminar, seleccionar } =
  useClientes(props.useCases);

const editing = ref<Cliente | null>(null);
const notice = ref<string | null>(null);
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

function notify(msg: string): void {
  notice.value = msg;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = null), 3000);
}

function onSaved(c: Cliente): void {
  notify(editing.value ? `Cliente "${c.nombre}" actualizado.` : `Cliente "${c.nombre}" creado.`);
  editing.value = null;
}

async function onRemove(c: Cliente): Promise<void> {
  if (editing.value?.id === c.id) editing.value = null;
  if (await eliminar(c.id)) notify(`Cliente "${c.nombre}" eliminado.`);
}

onMounted(cargar);
</script>

<template>
  <!-- `.mfc` es la raíz del micro (reset acotado) y el contenedor de las container queries. -->
  <section class="mfc mfc:@container mfc:flex mfc:flex-col mfc:gap-5 mfc:text-slate-800 mfc:dark:text-slate-100">
    <header class="mfc:flex mfc:flex-wrap mfc:items-start mfc:justify-between mfc:gap-3">
      <div class="mfc:min-w-0">
        <div class="mfc:flex mfc:items-center mfc:gap-2">
          <h2 class="mfc:text-xl mfc:font-semibold mfc:tracking-tight">Clientes</h2>
          <span
            v-if="clientes.length"
            class="mfc:rounded-full mfc:bg-indigo-50 mfc:px-2 mfc:py-0.5 mfc:text-xs mfc:font-medium mfc:text-indigo-700 mfc:dark:bg-indigo-500/15 mfc:dark:text-indigo-300"
          >
            {{ clientes.length }}
          </span>
        </div>
        <p class="mfc:mt-1 mfc:text-sm mfc:text-slate-500 mfc:dark:text-slate-400">
          Gestiona la cartera de clientes. Selecciona uno para ver sus ventas.
        </p>
      </div>
      <button type="button" class="mfc-btn mfc-btn-ghost" :disabled="loading" @click="cargar">
        <svg
          class="mfc:size-4"
          :class="{ 'mfc:animate-spin': loading }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        Recargar
      </button>
    </header>

    <ClienteForm :cliente="editing" :on-save="guardar" @saved="onSaved" @cancel="editing = null" />

    <Transition
      enter-from-class="mfc:opacity-0 mfc:-translate-y-1"
      enter-active-class="mfc:transition mfc:duration-200"
      leave-to-class="mfc:opacity-0"
      leave-active-class="mfc:transition mfc:duration-200"
    >
      <div
        v-if="notice"
        class="mfc:flex mfc:items-center mfc:gap-2 mfc:rounded-lg mfc:bg-emerald-50 mfc:px-3 mfc:py-2 mfc:text-sm mfc:text-emerald-700 mfc:ring-1 mfc:ring-emerald-200 mfc:dark:bg-emerald-500/10 mfc:dark:text-emerald-300 mfc:dark:ring-emerald-500/20"
        role="status"
      >
        <svg class="mfc:size-4 mfc:shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
            clip-rule="evenodd"
          />
        </svg>
        {{ notice }}
      </div>
    </Transition>

    <div
      v-if="loading && clientes.length === 0"
      class="mfc:flex mfc:flex-col mfc:gap-3 mfc:rounded-2xl mfc:p-4 mfc:ring-1 mfc:ring-slate-200 mfc:dark:ring-white/10"
      data-state="loading"
      aria-label="Cargando clientes…"
    >
      <div v-for="i in 3" :key="i" class="mfc:h-12 mfc:animate-pulse mfc:rounded-lg mfc:bg-slate-100 mfc:dark:bg-white/5" />
    </div>
    <div
      v-else-if="error"
      class="mfc:rounded-2xl mfc:bg-rose-50 mfc:p-6 mfc:text-center mfc:text-sm mfc:text-rose-700 mfc:ring-1 mfc:ring-rose-200 mfc:dark:bg-rose-500/10 mfc:dark:text-rose-300 mfc:dark:ring-rose-500/20"
      data-state="error"
      role="alert"
    >
      {{ error }}
      <button type="button" class="mfc:ml-1 mfc:font-medium mfc:underline mfc:underline-offset-2" @click="cargar">
        Reintentar
      </button>
    </div>
    <div
      v-else-if="isEmpty"
      class="mfc:rounded-2xl mfc:border mfc:border-dashed mfc:border-slate-300 mfc:p-8 mfc:text-center mfc:text-sm mfc:text-slate-500 mfc:dark:border-white/15 mfc:dark:text-slate-400"
      data-state="empty"
    >
      Aún no hay clientes. Crea el primero con el formulario.
    </div>
    <ClientesTable
      v-else
      :clientes="clientes"
      :selected-id="selectedId"
      :deleting-id="deletingId"
      :editing-id="editing?.id ?? null"
      @select="seleccionar"
      @edit="editing = $event"
      @remove="onRemove"
    />
  </section>
</template>
