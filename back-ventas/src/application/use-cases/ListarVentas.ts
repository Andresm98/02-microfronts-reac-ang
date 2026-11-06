import type { VentaRepository } from "../../domain/ports/VentaRepository.js";
import { toVentaDTO, type VentaDTO } from "../dto/VentaDTO.js";

export class ListarVentas {
  constructor(private readonly repo: VentaRepository) {}

  async execute(filtro: { clienteId?: string } = {}): Promise<VentaDTO[]> {
    const clienteId = filtro.clienteId?.trim() || undefined;
    const ventas = await this.repo.findAll(clienteId ? { clienteId } : {});
    return ventas.map(toVentaDTO);
  }
}
