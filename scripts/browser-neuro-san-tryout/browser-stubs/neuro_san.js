// Browser stub: registries live under /registries (served by Vite public/)
const REGISTRIES_BASIS = "/registries"

export class TOP_LEVEL_DIR {
  constructor(basis = REGISTRIES_BASIS) { this.basis = basis }
  get_file_in_basis(rel) {
    return `${this.basis.replace(/\/$/, "")}/${String(rel).replace(/^\//, "")}`
  }
}

export const REGISTRIES_DIR = new TOP_LEVEL_DIR(REGISTRIES_BASIS)
export default { TOP_LEVEL_DIR, REGISTRIES_DIR }
