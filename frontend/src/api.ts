import type { Block } from "./types";

export const getBlocks = (): Promise<Block[]> => fetch("/api/blocks").then((r) => r.json());

export async function saveBlock(b: Block) {
  const r = await fetch(`/api/blocks/${b.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
  if (!r.ok) throw new Error((await r.json()).detail ?? "Save failed");
}

export const deleteBlock = (id: string) => fetch(`/api/blocks/${id}`, { method: "DELETE" });

export const validate = (yaml: string): Promise<{ ok: boolean; errors: string[]; linted: boolean }> =>
  fetch("/api/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ yaml }),
  }).then((r) => r.json());
