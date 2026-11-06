import type { Clock, IdGenerator } from "../domain/ports/IdGenerator.js";
import type { VentaRepository } from "../domain/ports/VentaRepository.js";
import { ListarVentas } from "./use-cases/ListarVentas.js";
import { ObtenerVenta } from "./use-cases/ObtenerVenta.js";
import { RegistrarVenta } from "./use-cases/RegistrarVenta.js";

export { ListarVentas, ObtenerVenta, RegistrarVenta };
export type { LineaVentaDTO, RegistrarVentaInput, VentaDTO } from "./dto/VentaDTO.js";

/** Conjunto de casos de uso que consume la capa HTTP. */
export interface VentasUseCases {
  registrar: RegistrarVenta;
  listar: ListarVentas;
  obtener: ObtenerVenta;
}

export function buildVentasUseCases(repo: VentaRepository, ids: IdGenerator, clock: Clock): VentasUseCases {
  return {
    registrar: new RegistrarVenta(repo, ids, clock),
    listar: new ListarVentas(repo),
    obtener: new ObtenerVenta(repo),
  };
}
