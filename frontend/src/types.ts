export interface Block {
  id: string;
  name: string;
  category: string;
  yaml: string;
}

export interface TaskData extends Record<string, unknown> {
  blockId: string;
  label: string;
  yaml: string;
}
