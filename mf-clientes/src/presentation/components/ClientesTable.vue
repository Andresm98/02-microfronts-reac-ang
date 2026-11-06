<script setup lang="ts">
import { ref } from 'vue';
import type { Cliente } from '../../domain';

defineProps<{
  clientes: Cliente[];
  selectedId: string | null;
  deletingId: string | null;
  editingId: string | null;
}>();
const emit = defineEmits<{ select: [cliente: Cliente]; edit: [cliente: Cliente]; remove: [cliente: Cliente] }>();

const confirmingId = ref<string | null>(null);

function confirmar(c: Cliente): void {
  confirmingId.value = null;
  emit('remove', c);
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

// Bajo @4xl (contenedor estrecho, p. ej. el dashboard) cada fila se pinta como tarjeta;
// a partir de @4xl recupera el layout de tabla. Una sola marca semántica para ambos.
const cell = 'mfc:block mfc:@4xl:table-cell mfc:@4xl:px-4 mfc:@4xl:py-3 mfc:@4xl:align-middle';
const metaCell = `${cell} mfc:text-xs mfc:text-slate-500 mfc:dark:text-slate-400 mfc:@4xl:text-sm mfc:@4xl:text-slate-600 mfc:dark:@4xl:text-slate-300 mfc:before:mr-1 mfc:before:font-medium mfc:before:content-[attr(data-label)] mfc:@4xl:before:content-none`;
</script>

<template>
  <div class="mfc-card mfc:overflow-hidden">
    <table class="mfc:block mfc:w-full mfc:text-sm mfc:@4xl:table mfc:@4xl:border-collapse">
      <thead
        class="mfc:hidden mfc:bg-slate-50 mfc:text-left mfc:text-xs mfc:font-medium mfc:tracking-wide mfc:text-slate-500 mfc:uppercase mfc:@4xl:table-header-group mfc:dark:bg-white/5 mfc:dark:text-slate-400"
      >
        <tr>
          <th class="mfc:px-4 mfc:py-3 mfc:font-medium">Nombre</th>
          <th class="mfc:px-4 mfc:py-3 mfc:font-medium">Email</th>
          <th class="mfc:px-4 mfc:py-3 mfc:font-medium">Documento</th>
          <th class="mfc:px-4 mfc:py-3 mfc:font-medium">Teléfono</th>
          <th class="mfc:px-4 mfc:py-3 mfc:text-right mfc:font-medium">Acciones</th>
        </tr>
      </thead>
      <tbody class="mfc:block mfc:divide-y mfc:divide-slate-100 mfc:@4xl:table-row-group mfc:dark:divide-white/5">
        <tr
          v-for="c in clientes"
          :key="c.id"
          class="mfc:grid mfc:grid-cols-2 mfc:gap-x-4 mfc:gap-y-1 mfc:p-4 mfc:transition-colors mfc:@4xl:table-row mfc:@4xl:p-0"
          :class="
            c.id === selectedId
              ? 'selected mfc:bg-indigo-50/80 mfc:shadow-[inset_3px_0_0_var(--mfc-color-indigo-500)] mfc:dark:bg-indigo-500/10'
              : 'mfc:hover:bg-slate-50 mfc:dark:hover:bg-white/5'
          "
          :data-id="c.id"
        >
          <td :class="cell" class="mfc:col-span-2">
            <div class="mfc:flex mfc:min-w-0 mfc:items-center mfc:gap-3">
              <span
                class="mfc:grid mfc:size-9 mfc:shrink-0 mfc:place-items-center mfc:rounded-full mfc:bg-linear-to-br mfc:from-indigo-500 mfc:to-violet-500 mfc:text-xs mfc:font-semibold mfc:text-white"
                aria-hidden="true"
              >
                {{ iniciales(c.nombre) }}
              </span>
              <div class="mfc:min-w-0">
                <div class="mfc:flex mfc:items-center mfc:gap-2">
                  <span class="mfc:truncate mfc:font-semibold">{{ c.nombre }}</span>
                  <span
                    v-if="c.id === editingId"
                    class="mfc:rounded-full mfc:bg-amber-100 mfc:px-2 mfc:py-0.5 mfc:text-[11px] mfc:font-medium mfc:text-amber-800 mfc:dark:bg-amber-500/15 mfc:dark:text-amber-300"
                  >
                    editando
                  </span>
                </div>
                <div class="mfc:truncate mfc:text-xs mfc:text-slate-500 mfc:@4xl:hidden mfc:dark:text-slate-400">{{ c.email }}</div>
              </div>
            </div>
          </td>
          <td class="mfc:hidden mfc:max-w-64 mfc:truncate mfc:@4xl:px-4 mfc:@4xl:py-3 mfc:@4xl:align-middle mfc:text-slate-600 mfc:@4xl:table-cell mfc:dark:text-slate-300">
            {{ c.email }}
          </td>
          <td :class="metaCell" class="mfc:mt-2 mfc:@4xl:mt-0" data-label="Doc.">{{ c.documento }}</td>
          <td :class="metaCell" class="mfc:mt-2 mfc:@4xl:mt-0" data-label="Tel.">{{ c.telefono ?? '—' }}</td>
          <td :class="cell" class="mfc:col-span-2 mfc:mt-3 mfc:@4xl:mt-0">
            <div class="mfc:flex mfc:flex-wrap mfc:items-center mfc:gap-2 mfc:@4xl:flex-nowrap mfc:@4xl:justify-end">
              <template v-if="confirmingId === c.id">
                <span class="mfc:mr-1 mfc:text-xs mfc:font-medium mfc:text-rose-600 mfc:dark:text-rose-400">¿Eliminar?</span>
                <button type="button" class="mfc-btn mfc-btn-sm mfc-btn-danger" data-action="confirm-delete" @click="confirmar(c)">
                  Sí
                </button>
                <button type="button" class="mfc-btn mfc-btn-sm mfc-btn-ghost" @click="confirmingId = null">No</button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="mfc-btn mfc-btn-sm"
                  :class="
                    c.id === selectedId
                      ? 'mfc-btn-primary'
                      : 'mfc:text-indigo-700 mfc:ring-1 mfc:ring-indigo-200 mfc:hover:bg-indigo-50 mfc:dark:text-indigo-300 mfc:dark:ring-indigo-500/30 mfc:dark:hover:bg-indigo-500/10'
                  "
                  data-action="select"
                  :aria-pressed="c.id === selectedId"
                  @click="emit('select', c)"
                >
                  {{ c.id === selectedId ? 'Seleccionado' : 'Seleccionar' }}
                </button>
                <button type="button" class="mfc-btn mfc-btn-sm mfc-btn-ghost" data-action="edit" @click="emit('edit', c)">
                  Editar
                </button>
                <button
                  type="button"
                  class="mfc-btn mfc-btn-sm mfc:text-rose-600 mfc:hover:bg-rose-50 mfc:dark:text-rose-400 mfc:dark:hover:bg-rose-500/10"
                  data-action="delete"
                  :disabled="deletingId === c.id"
                  @click="confirmingId = c.id"
                >
                  {{ deletingId === c.id ? 'Eliminando…' : 'Eliminar' }}
                </button>
              </template>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
