import { VentaNoEncontradaError } from "../../domain/errors.js";
import type { VentaRepository } from "../../domain/ports/VentaRepository.js";
import { toVentaDTO, type VentaDTO } from "../dto/VentaDTO.js";

export class ObtenerVenta {
  constructor(private readonly repo: VentaRepository) {}

  async execute(id: string): Promise<VentaDTO> {
    const venta = await this.repo.findById(id);
    if (!venta) throw new VentaNoEncontradaError(id);
    return toVentaDTO(venta);
  }
}
