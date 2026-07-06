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
