export type StripeMetadataInput = Record<string, unknown> | undefined | null;

export const normalizeStripeMetadata = (metadata: StripeMetadataInput): Record<string, string> => {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) => {
      if (value === undefined || value === null) return [] as Array<[string, string]>;
      if (typeof value === "string") return [[key, value]];
      if (typeof value === "number" || typeof value === "boolean" || value instanceof Date) {
        return [[key, value.toString()]];
      }
      try {
        return [[key, JSON.stringify(value)]];
      } catch {
        return [] as Array<[string, string]>;
      }
    }),
  );
};
