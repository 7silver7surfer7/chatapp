# Gemini Chat

A minimal AI chat app powered by Google Gemini. Node/Express backend keeps the
API key server-side and streams responses to a lightweight vanilla-JS frontend.

## Features

- Streaming responses (SSE) with a typing indicator
- Multi-turn conversations with full history
- Minimal markdown rendering (code blocks, inline code, bold/italic)
- No frontend framework, no build step

## Setup

1. Install dependencies (Node 20.12+ required):

   ```sh
   npm install
   ```

2. Create your env file and add your Gemini API key
   (get one at https://aistudio.google.com/apikey):

   ```sh
   cp .env.example .env
   ```

3. Start the server:

   ```sh
   npm start
   ```

4. Open http://localhost:3000

## Configuration

| Variable         | Default            | Description                  |
| ---------------- | ------------------ | ---------------------------- |
| `GEMINI_API_KEY` | — (required)       | Google AI Studio API key     |
| `GEMINI_MODEL`   | `gemini-2.5-flash` | Gemini model to use          |
| `PORT`           | `3000`             | HTTP port                    |

> **Note:** never commit `.env` — it is gitignored. The key stays on the
> server; the browser only talks to `/api/chat`.

## CI/CD

GitHub Actions (`.github/workflows/ci-cd.yml`) runs on every push and PR to
`main`:

1. **ci** — installs dependencies, syntax-checks the JS, boots the server and
   hits `/healthz`, and verifies the Docker image builds.
2. **push-image** (pushes to `main` only) — builds the image and pushes it to
   ECR tagged with the commit SHA and `latest`.
3. **deploy** — points `kubectl` at the EKS cluster, applies `k8s/` with the
   image pinned to the commit SHA, and waits for the rollout to finish.

The CD stages stay **skipped** until two repository variables are set
(Settings → Secrets and variables → Actions → Variables):

| Variable           | Value                                                     |
| ------------------ | --------------------------------------------------------- |
| `AWS_ROLE_ARN`     | IAM role assumed via GitHub OIDC (ECR push + EKS access)  |
| `EKS_CLUSTER_NAME` | Name of the EKS cluster to deploy to                      |

No long-lived AWS keys are stored in GitHub — the workflow authenticates with
short-lived OIDC role assumption. The role's trust policy must allow
`token.actions.githubusercontent.com` for this repo, and the cluster must map
the role to a group allowed to manage the `chatapp` namespace. The
`GEMINI_API_KEY` is not handled by CI at all — it lives in the in-cluster
`chatapp-secrets` secret.
