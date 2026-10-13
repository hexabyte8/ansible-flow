import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, ReactFlow, ReactFlowProvider,
  useReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange,
} from "@xyflow/react";
import Editor from "@monaco-editor/react";
import { deleteBlock, getBlocks, saveBlock, validate } from "./api";
import { buildPlaybook, type PlaybookMeta } from "./playbook";
import type { Block, TaskData } from "./types";

const EMPTY_BLOCK: Block = { id: "", name: "", category: "Custom", yaml: "ansible.builtin.debug:\n  msg: hello\n" };

function Builder() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [nodes, setNodes] = useState<Node<TaskData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [meta, setMeta] = useState<PlaybookMeta>({ name: "My playbook", hosts: "all", become: false });
  const [tab, setTab] = useState<"playbook" | "block">("playbook");
  const [draft, setDraft] = useState<Block>(EMPTY_BLOCK);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const refresh = useCallback(
    () => getBlocks().then(setBlocks).catch(() => setMsg({ ok: false, text: "Backend unreachable" })),
    [],
  );
  useEffect(() => { refresh(); }, [refresh]);

  const playbook = useMemo(() => {
    try { return buildPlaybook(nodes, edges, meta); } catch (e) { return `# Error: ${(e as Error).message}`; }
  }, [nodes, edges, meta]);

  const onNodesChange = useCallback((c: NodeChange<Node<TaskData>>[]) => setNodes((n) => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((e) => applyEdgeChanges(c, e)), []);
  const onConnect = useCallback((c: Connection) => setEdges((e) => addEdge(c, e)), []);

  const onDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    const b = blocks.find((x) => x.id === ev.dataTransfer.getData("block"));
    if (!b) return;
    const node: Node<TaskData> = {
      id: `${b.id}-${Date.now()}`,
      position: screenToFlowPosition({ x: ev.clientX, y: ev.clientY }),
      data: { blockId: b.id, label: b.name, yaml: b.yaml },
    };
    setNodes((n) => [...n, node]);
  };

  const onSave = async () => {
    try {
      await saveBlock(draft);
      setMsg({ ok: true, text: "Block saved" });
      refresh();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };

  const onValidate = async () => {
    const r = await validate(playbook);
    setMsg({
      ok: r.ok,
      text: r.ok ? (r.linted ? "Valid (ansible-lint passed)" : "Valid YAML (ansible-lint not installed)") : r.errors.join("\n"),
    });
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([playbook], { type: "text/yaml" }));
    a.download = "playbook.yml";
    a.click();
  };

  const categories = [...new Set(blocks.map((b) => b.category))];

  return (
    <div className="app">
      <div className="top">
        <b>Ansible Flow</b>
        <input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
        <input value={meta.hosts} onChange={(e) => setMeta({ ...meta, hosts: e.target.value })} size={10} title="hosts" />
        <label><input type="checkbox" checked={meta.become} onChange={(e) => setMeta({ ...meta, become: e.target.checked })} /> become</label>
        <button onClick={onValidate}>Validate</button>
        <button onClick={download}>Download</button>
      </div>

      <div className="side">
        <button onClick={() => { setDraft(EMPTY_BLOCK); setTab("block"); }}>+ New block</button>
        {categories.map((c) => (
          <div key={c}>
            <h4>{c}</h4>
            {blocks.filter((b) => b.category === c).map((b) => (
              <div key={b.id} className="item" draggable onDragStart={(e) => e.dataTransfer.setData("block", b.id)}>
                {b.name}
                <span className="edit" onClick={() => { setDraft(b); setTab("block"); }}>edit</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
        onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
        fitView deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background /><Controls />
      </ReactFlow>

      <div className="right">
        <div className="tabs">
          <button className={tab === "playbook" ? "on" : ""} onClick={() => setTab("playbook")}>Playbook YAML</button>
          <button className={tab === "block" ? "on" : ""} onClick={() => setTab("block")}>Block IDE</button>
        </div>
        {msg && <div className={msg.ok ? "ok" : "errors"}>{msg.text}</div>}
        <div className="body">
          {tab === "playbook" ? (
            <Editor language="yaml" value={playbook} options={{ readOnly: true, minimap: { enabled: false } }} />
          ) : (
            <>
              <div className="form">
                <input placeholder="id (letters, digits, - _)" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
                <input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <input placeholder="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                <div>
                  <button onClick={onSave}>Save block</button>{" "}
                  <button onClick={() => deleteBlock(draft.id).then(refresh)}>Delete</button>
                </div>
              </div>
              <Editor language="yaml" value={draft.yaml} onChange={(v) => setDraft((d) => ({ ...d, yaml: v ?? "" }))} options={{ minimap: { enabled: false } }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <ReactFlowProvider><Builder /></ReactFlowProvider>;
}
