import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, formatMessages, type PartialMessage } from "esbuild";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultEntryPoint = path.join(packageRoot, "src", "business-tools.ts");
const forbiddenInputs = [
  /(?:^|\/)(?:packages\/aggregate\/)?src\/server\.ts$/,
  /(?:^|\/)(?:packages\/aggregate\/)?src\/server-instructions\.ts$/,
  /(?:^|\/)(?:packages\/aggregate\/)?src\/lib\/data\.ts$/,
  /(?:^|\/)(?:packages\/aggregate\/)?src\/lib\/runapi-client\.ts$/,
  /packages\/core\/dist\/(?:config|login|runapi-client|server)\.js$/
];

export async function checkWebSafeBuild(entryPoint = defaultEntryPoint): Promise<void> {
  const result = await build({
    absWorkingDir: packageRoot,
    entryPoints: [entryPoint],
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "es2022",
    conditions: ["browser", "worker", "import", "default"],
    write: false,
    metafile: true,
    logLevel: "silent"
  }).catch(async (error: unknown) => {
    const errors = buildErrors(error);
    const messages = errors.length > 0
      ? await formatMessages(errors, { kind: "error", color: false })
      : [error instanceof Error ? error.message : String(error)];
    throw new Error(`Business Tools browser build failed:\n${messages.join("\n")}`);
  });

  const localInputs = Object.keys(result.metafile.inputs)
    .map((input) => path.normalize(path.isAbsolute(input) ? input : path.resolve(packageRoot, input)))
    .filter(isLocalOnlyInput);
  if (localInputs.length > 0) {
    throw new Error(`Business Tools browser build included Local-only modules:\n${localInputs.join("\n")}`);
  }
}

export function isLocalOnlyInput(input: string): boolean {
  const portableInput = input.replaceAll("\\", "/");
  return forbiddenInputs.some((pattern) => pattern.test(portableInput));
}

function buildErrors(error: unknown): PartialMessage[] {
  if (!error || typeof error !== "object" || !("errors" in error)) {
    return [];
  }

  return (error as { errors: PartialMessage[] }).errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkWebSafeBuild();
}
