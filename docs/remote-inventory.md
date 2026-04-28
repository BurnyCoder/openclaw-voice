# Sanitized Remote Inventory

This repo was built from the reproducible parts of a running OpenClaw container on `147.93.55.99`.

Captured shape:

- Container: `openclaw-cvhf-openclaw-1`
- Image: `ghcr.io/hostinger/hvps-openclaw:latest`
- Entrypoint: `/entrypoint.sh`
- Command: `node server.mjs`
- Working directory: `/data`
- Published port: `50918`
- Persistent mounts:
  - `/docker/openclaw-cvhf/data` -> `/data`
  - `/docker/openclaw-cvhf/data/linuxbrew` -> `/home/linuxbrew`
- OpenClaw CLI reported: `OpenClaw 2026.4.21`
- Installed npm package reported: `openclaw@2026.4.26`

Enabled OpenClaw features:

- Telegram channel enabled with BotFather token configured.
- WhatsApp channel enabled and linked.
- Text-to-speech enabled with `messages.tts.auto = "always"`.
- TTS provider: ElevenLabs.
- ElevenLabs voice ID in the captured setup: `JBFqnCBsd6RMkjVDRZzb`.
- ElevenLabs model ID in the captured setup: `eleven_v3`.
- Main agent workspace: `/data/.openclaw/workspace`.
- Agent model alias: `ChatGPT 5.4`.
- Thinking default: `low`.

Intentionally not copied:

- OpenAI, Telegram, ElevenLabs, gateway, hook, device, and session tokens.
- WhatsApp auth state.
- Paired device credentials.
- SQLite memory/task/flow databases.
- Inbound and outbound voice media.
- Logs, npm caches, Homebrew caches, shell history, and generated runtime state.

Security notes from the captured machine:

- The remote environment contained live API credentials. Rotate those credentials if the machine or transcript was shared.
- The captured setup had elevated tool access allowed from webchat wildcard. This repo defaults elevated tools to off.
- The captured setup allowed insecure Control UI auth. This repo defaults that toggle to off.
