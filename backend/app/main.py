import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import yaml
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Ansible Flow")

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "blocks"
DATA_DIR.mkdir(parents=True, exist_ok=True)
ID_RE = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")

DEFAULT_BLOCKS = [
    {"id": "apt-install", "name": "Install package (apt)", "category": "Packages",
     "yaml": "ansible.builtin.apt:\n  name: nginx\n  state: present\n  update_cache: true\n"},
    {"id": "service", "name": "Manage service", "category": "Services",
     "yaml": "ansible.builtin.service:\n  name: nginx\n  state: started\n  enabled: true\n"},
    {"id": "copy", "name": "Copy file", "category": "Files",
     "yaml": "ansible.builtin.copy:\n  src: files/app.conf\n  dest: /etc/app.conf\n  mode: '0644'\n"},
    {"id": "shell", "name": "Run command", "category": "Commands",
     "yaml": "ansible.builtin.command: echo hello\n"},
]


class Block(BaseModel):
    id: str
    name: str
    category: str = "Custom"
    yaml: str


class ValidateRequest(BaseModel):
    yaml: str


def _path(block_id: str) -> Path:
    if not ID_RE.match(block_id):
        raise HTTPException(400, "Invalid block id")
    return DATA_DIR / f"{block_id}.json"


@app.get("/api/blocks")
def list_blocks():
    custom = [json.loads(p.read_text()) for p in sorted(DATA_DIR.glob("*.json"))]
    ids = {b["id"] for b in custom}
    return [b for b in DEFAULT_BLOCKS if b["id"] not in ids] + custom


@app.put("/api/blocks/{block_id}")
def save_block(block_id: str, block: Block):
    if block.id != block_id:
        raise HTTPException(400, "id mismatch")
    try:
        parsed = yaml.safe_load(block.yaml)
    except yaml.YAMLError as e:
        raise HTTPException(422, f"Invalid YAML: {e}")
    if not isinstance(parsed, dict):
        raise HTTPException(422, "Block YAML must be a mapping (task keywords + module)")
    _path(block_id).write_text(block.model_dump_json(indent=2))
    return block


@app.delete("/api/blocks/{block_id}")
def delete_block(block_id: str):
    p = _path(block_id)
    if p.exists():
        p.unlink()
    return {"ok": True}


@app.post("/api/validate")
def validate(req: ValidateRequest):
    try:
        yaml.safe_load(req.yaml)
    except yaml.YAMLError as e:
        return {"ok": False, "errors": [f"YAML: {e}"], "linted": False}
    lint = shutil.which("ansible-lint")
    if not lint:
        return {"ok": True, "errors": [], "linted": False}
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / "playbook.yml"
        f.write_text(req.yaml)
        r = subprocess.run([lint, "-p", str(f)], check=False, capture_output=True, text=True, timeout=60)
    msgs = [l for l in r.stdout.splitlines() if l.strip()]
    return {"ok": r.returncode == 0, "errors": msgs, "linted": True}
