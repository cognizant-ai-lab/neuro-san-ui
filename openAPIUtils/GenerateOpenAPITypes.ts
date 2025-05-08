import fs from "fs"
// eslint-disable-next-line unicorn/import-style
import path, {dirname} from "path"
import {Project} from "ts-morph"
import {fileURLToPath} from "url"

// eslint-disable-next-line no-shadow
const __filename = fileURLToPath(import.meta.url)
// eslint-disable-next-line no-shadow
const __dirname = dirname(__filename)

const staticTypesPath = path.resolve(__dirname, "./StaticAgentTypes.ts")
const staticHeader = fs.readFileSync(staticTypesPath, "utf8")
const reservedNames = ["Function"]

const project = new Project()
const sourceFile = project.addSourceFileAtPath(
  path.resolve(__dirname, "../generated/neuro-san/NeuroSanClient.d.ts")
)

const interfaceDecl = sourceFile.getInterfaceOrThrow("components")
const schemasProp = interfaceDecl.getPropertyOrThrow("schemas")
const schemasType = schemasProp.getType().getApparentProperties()

const lines = schemasType.map((prop) => {
  const schemaType = prop.getName()
  const exportName = reservedNames.includes(schemaType) ? `_${schemaType}` : schemaType
  return `export type ${exportName} = components["schemas"]["${schemaType}"]`
})

const fileContent = [staticHeader, ...lines, ""]
	.join("\n")
	.replace("// @ts-expect-error TS2307: Module not found", "")
	.replace("// eslint-disable-next-line import/no-unresolved, @typescript-eslint/no-unused-vars", "")
	.replace(/\n{3,}/gu, "\n\n") // Collapse 3+ newlines into just 2

fs.writeFileSync(
  path.resolve(__dirname, "../components/AgentChat/Types.ts"),
  fileContent
)

console.log(`Generated ${lines.length} type exports from components.schemas`)
