import { buildVentasUseCases } from "../src/application/index.js";
import { InMemoryVentaRepository } from "../src/infrastructure/persistence/InMemoryVentaRepository.js";

/** Casos de uso con repositorio en memoria, ids secuenciales y reloj incremental. */
export function setup() {
  const repo = new InMemoryVentaRepository();
  let seq = 0;
  let t = Date.parse("2026-10-01T00:00:00.000Z");
  const useCases = buildVentasUseCases(
    repo,
    { next: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}` },
    { now: () => new Date((t += 1000)) },
  );
  return { repo, useCases };
}
