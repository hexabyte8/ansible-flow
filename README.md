# Ansible Flow

Open source, web-based Ansible workflow builder with a small IDE for authoring reusable building blocks.

- **Canvas**: drag blocks onto a canvas, connect them; connection order becomes task order.
- **Block IDE**: Monaco editor to create/edit blocks (a block = one Ansible task template in YAML), saved on the backend.
- **Export**: live playbook YAML preview, download, and server-side validation (YAML syntax, plus `ansible-lint` if installed).

## Run

Backend (Python 3.10+):

    cd backend
    python -m venv .venv && . .venv/bin/activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000

Frontend (Node 18+):

    cd frontend
    npm install
    npm run dev

Open http://localhost:5173 (API is proxied to :8000).

## Layout

    backend/app/main.py   FastAPI: /api/blocks CRUD, /api/validate
    frontend/src/         React + React Flow + Monaco UI

## Roadmap
Execution via ansible-runner with live logs, branching/conditional edges, inventory editor, block sharing.

MIT licensed.

## Containers

    docker compose up --build      # http://localhost:8080

Images are published to GHCR by `.github/workflows/release.yml`:
`ghcr.io/hexabyte8/ansible-flow-backend` and `ghcr.io/hexabyte8/ansible-flow-frontend`
(tags: `latest`, `sha-<short>`, and `X.Y.Z` on `vX.Y.Z` tags).

## Kubernetes

    kubectl apply -k k8s

Edit the host in `k8s/ingress.yaml` first. Blocks persist on a 1Gi PVC. The frontend nginx proxies `/api` to the `backend` service.

The `Deploy to Kubernetes` workflow (manual) applies the manifests using a base64 kubeconfig in the `KUBE_CONFIG` repo secret.

## CI

- `ci.yml`: ruff, frontend build, kustomize + kubeconform validation, image build checks.
- `release.yml`: multi-arch images pushed to GHCR on `main` and `v*` tags.
