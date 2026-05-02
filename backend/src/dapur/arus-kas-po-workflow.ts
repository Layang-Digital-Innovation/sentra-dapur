import { Prisma } from '@prisma/client';

/**
 * Field workflow PO di model ArusKas (schema). Dipakai saat Prisma Client TS
 * di IDE/node_modules belum regenerate — narasi tetap sinkron dengan DB.
 */
export type ArusKasPoWorkflowFields = {
  pendingPoApproval: boolean;
  markedForDeletion: boolean;
  pendingEditData: Prisma.JsonValue | null;
};

export function asArusKasPoRow<T extends { id?: string }>(
  row: T | null,
): (T & ArusKasPoWorkflowFields) | null {
  if (!row) return null;
  return row as T & ArusKasPoWorkflowFields;
}

/** Gabungkan field update standar + workflow ke bentuk yang diterima Prisma. */
export function asArusKasUpdate(data: Record<string, unknown>): Prisma.ArusKasUpdateInput {
  return data as unknown as Prisma.ArusKasUpdateInput;
}
