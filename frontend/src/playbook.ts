import yaml from "js-yaml";
import type { Edge, Node } from "@xyflow/react";
import type { TaskData } from "./types";

export interface PlaybookMeta {
  name: string;
  hosts: string;
  become: boolean;
}

// Order nodes topologically by edges; ties and cycles fall back to canvas x/y position.
export function orderNodes(nodes: Node<TaskData>[], edges: Edge[]): Node<TaskData>[] {
  const byPos = [...nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  const indeg = new Map(byPos.map((n) => [n.id, 0]));
  edges.forEach((e) => indeg.has(e.target) && indeg.set(e.target, indeg.get(e.target)! + 1));
  const out: Node<TaskData>[] = [];
  const done = new Set<string>();
  while (out.length < byPos.length) {
    const next =
      byPos.find((n) => !done.has(n.id) && indeg.get(n.id) === 0) ?? byPos.find((n) => !done.has(n.id))!;
    done.add(next.id);
    out.push(next);
    edges.filter((e) => e.source === next.id).forEach((e) => indeg.set(e.target, (indeg.get(e.target) ?? 1) - 1));
  }
  return out;
}

export function buildPlaybook(nodes: Node<TaskData>[], edges: Edge[], meta: PlaybookMeta): string {
  const tasks = orderNodes(nodes, edges).map((n) => {
    const body = (yaml.load(n.data.yaml) ?? {}) as Record<string, unknown>;
    return { name: n.data.label, ...body };
  });
  const play: Record<string, unknown> = { name: meta.name, hosts: meta.hosts };
  if (meta.become) play.become = true;
  play.tasks = tasks;
  return yaml.dump([play], { lineWidth: 100, noRefs: true });
}
