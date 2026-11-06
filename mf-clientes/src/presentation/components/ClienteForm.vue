<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { validarCliente, type Cliente, type ClienteFieldErrors, type ClienteInput } from '../../domain';
import type { SaveResult } from '../composables/useClientes';

const props = defineProps<{
  cliente: Cliente | null;
  onSave: (input: ClienteInput, id?: string) => Promise<SaveResult>;
}>();
const emit = defineEmits<{ saved: [cliente: Cliente]; cancel: [] }>();

const form = reactive<Required<ClienteInput> & { telefono: string }>({ nombre: '', email: '', documento: '', telefono: '' });
const errors = ref<ClienteFieldErrors>({});
const formError = ref<string | null>(null);
const saving = ref(false);
const editing = computed(() => props.cliente !== null);

function reset(c: Cliente | null): void {
  form.nombre = c?.nombre ?? '';
  form.email = c?.email ?? '';
  form.documento = c?.documento ?? '';
  form.telefono = c?.telefono ?? '';
  errors.value = {};
  formError.value = null;
}

watch(() => props.cliente, reset, { immediate: true });

async function submit(): Promise<void> {
  formError.value = null;
  errors.value = validarCliente(form);
  if (Object.keys(errors.value).length > 0) return;
  saving.value = true;
  const result = await props.onSave({ ...form }, props.cliente?.id);
  saving.value = false;
  if (result.ok) {
    emit('saved', result.cliente);
    if (!editing.value) reset(null);
  } else {
    errors.value = result.fieldErrors;
    formError.value = result.message;
  }
}

const fields: { key: keyof ClienteInput; label: string; type: string; placeholder: string; autocomplete: string }[] = [
  { key: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Ana Pérez', autocomplete: 'name' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'ana@correo.com', autocomplete: 'email' },
  { key: 'documento', label: 'Documento', type: 'text', placeholder: '12345678', autocomplete: 'off' },
  { key: 'telefono', label: 'Teléfono (opcional)', type: 'tel', placeholder: '+34 600 000 000', autocomplete: 'tel' },
];
</script>

<template>
  <form
    class="mfc-card mfc:p-4 mfc:@md:p-5"
    :class="{ 'mfc:ring-2 mfc:ring-indigo-500/60 mfc:dark:ring-indigo-400/50': editing }"
    novalidate
    @submit.prevent="submit"
  >
    <div class="mfc:mb-4 mfc:flex mfc:items-center mfc:gap-2">
      <span
        class="mfc:grid mfc:size-7 mfc:place-items-center mfc:rounded-lg mfc:bg-indigo-50 mfc:text-indigo-600 mfc:dark:bg-indigo-500/15 mfc:dark:text-indigo-300"
        aria-hidden="true"
      >
        <svg class="mfc:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path v-if="editing" d="M4 20h4L19 9l-4-4L4 16v4Z" />
          <path v-else d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <h3 class="mfc:text-base mfc:font-semibold">{{ editing ? 'Editar cliente' : 'Nuevo cliente' }}</h3>
    </div>

    <div
      v-if="formError"
      class="mfc:mb-4 mfc:rounded-lg mfc:bg-rose-50 mfc:px-3 mfc:py-2 mfc:text-sm mfc:text-rose-700 mfc:ring-1 mfc:ring-rose-200 mfc:dark:bg-rose-500/10 mfc:dark:text-rose-300 mfc:dark:ring-rose-500/20"
      role="alert"
    >
      {{ formError }}
    </div>

    <div class="mfc:grid mfc:gap-4 mfc:@md:grid-cols-2">
      <label v-for="f in fields" :key="f.key" class="mfc:flex mfc:flex-col mfc:gap-1.5">
        <span class="mfc-label">{{ f.label }}</span>
        <input
          v-model="form[f.key]"
          class="mfc-input"
          :name="f.key"
          :type="f.type"
          :placeholder="f.placeholder"
          :autocomplete="f.autocomplete"
          :aria-invalid="!!errors[f.key]"
        />
        <span v-if="errors[f.key]" class="mfc:text-xs mfc:text-rose-600 mfc:dark:text-rose-400" :data-error="f.key">
          {{ errors[f.key] }}
        </span>
      </label>
    </div>

    <div class="mfc:mt-5 mfc:flex mfc:flex-col-reverse mfc:gap-2 mfc:@sm:flex-row mfc:@sm:justify-end">
      <button v-if="editing" type="button" class="mfc-btn mfc-btn-ghost" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="mfc-btn mfc-btn-primary" :disabled="saving">
        {{ saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cliente' }}
      </button>
    </div>
  </form>
</template>
