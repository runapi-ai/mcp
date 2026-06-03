import { z } from "zod";
import type { ContractField } from "../types.js";

export function validateParams(fields: Record<string, ContractField>, params: Record<string, unknown>) {
  return z.object(schemaShape(fields)).passthrough().parse(params);
}

// The contract stores constraints, not complete JSON Schema. This keeps strict
// checks for required/enums/ranges while allowing API-specific params to pass through.
function schemaShape(fields: Record<string, ContractField>): Record<string, z.ZodTypeAny> {
  return Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, zodForField(field)]));
}

function zodForField(field: ContractField): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  if (field.enum?.length) {
    schema = z.union(field.enum.map((value) => literalFor(value)) as [z.ZodLiteral<unknown>, z.ZodLiteral<unknown>, ...z.ZodLiteral<unknown>[]]);
  } else if (field.type === "number" || field.type === "integer" || field.min !== undefined || field.max !== undefined || field.minimum !== undefined || field.maximum !== undefined) {
    let numberSchema = z.number();
    const min = field.min ?? field.minimum;
    const max = field.max ?? field.maximum;
    if (min !== undefined) {
      numberSchema = numberSchema.min(min);
    }
    if (max !== undefined) {
      numberSchema = numberSchema.max(max);
    }
    schema = numberSchema;
  } else if (field.type === "boolean") {
    schema = z.boolean();
  } else if (field.type === "array") {
    schema = z.array(z.unknown());
  } else if (field.type === "object") {
    schema = z.record(z.unknown());
  } else {
    schema = z.unknown();
  }

  return field.required ? schema : schema.optional();
}

function literalFor(value: unknown): z.ZodLiteral<unknown> {
  return z.literal(value as never);
}
