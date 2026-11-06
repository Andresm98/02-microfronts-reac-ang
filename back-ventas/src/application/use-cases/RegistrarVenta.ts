import { Venta } from "../../domain/entities/Venta.js";
import type { Clock, IdGenerator } from "../../domain/ports/IdGenerator.js";
import type { VentaRepository } from "../../domain/ports/VentaRepository.js";
import { type RegistrarVentaInput, toVentaDTO, type VentaDTO } from "../dto/VentaDTO.js";

export class RegistrarVenta {
  constructor(
    private readonly repo: VentaRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: RegistrarVentaInput): Promise<VentaDTO> {
    const venta = Venta.registrar(this.ids.next(), input, this.clock.now());
    await this.repo.save(venta);
    return toVentaDTO(venta);
  }
}
