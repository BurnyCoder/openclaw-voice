# OpenClaw Voice + Telegram Replica

This repository is a sanitized replication kit for the running OpenClaw setup that was deployed in Docker on Hostinger.

It preserves the important reproducible pieces:

- Hostinger OpenClaw Docker image and volume layout.
- Telegram channel enabled through a BotFather bot token.
- ElevenLabs voice mode with automatic TTS replies.
- Optional WhatsApp channel shape from the source setup.
- Main OpenClaw workspace templates.

## 1. Requirements

- Docker with Compose v2.
- An OpenAI API key.
- A Telegram bot token from BotFather.
- An ElevenLabs API key.
- Optional: Traefik if you want the same reverse-proxy label style.

## 2. Configure Secrets

```bash
cp .env.example .env
```

Edit `.env` and set at least:

```bash
OPENAI_API_KEY=...
OPENCLAW_GATEWAY_TOKEN=...
OPENCLAW_HOOKS_TOKEN=...
TELEGRAM_BOT_TOKEN=...
ELEVENLABS_API_KEY=...
```

Generate local tokens with:

```bash
openssl rand -hex 32
```

Keep `.env` private. It is ignored by git.

## 3. Seed OpenClaw State

```bash
node scripts/bootstrap-data.mjs
```

This creates `data/.openclaw/openclaw.json` and workspace files. Secrets are referenced from environment variables at runtime, not written directly into `openclaw.json`.

## 4. Start OpenClaw

```bash
docker compose up -d
docker compose logs -f openclaw
```

Open a shell inside the container:

```bash
docker compose exec openclaw bash
```

Check the setup:

```bash
openclaw config validate
openclaw status
openclaw channels list
```

## 5. Telegram Setup

1. Create a bot with Telegram BotFather and put the token in `.env` as `TELEGRAM_BOT_TOKEN`.
2. Start the container.
3. Send `/start` to your bot in Telegram.
4. In the container, check channel health:

```bash
openclaw channels status --probe
```

For stricter access, set numeric Telegram IDs in `.env`:

```bash
TELEGRAM_ALLOW_FROM=123456789,987654321
```

Then rerun:

```bash
node scripts/bootstrap-data.mjs
docker compose restart openclaw
```

Groups default to `requireMention=true`, matching the captured setup.

## 6. Voice Mode

The generated config enables:

```json
{
  "messages": {
    "tts": {
      "auto": "always",
      "provider": "elevenlabs"
    }
  }
}
```

The captured setup used:

- Voice ID: `JBFqnCBsd6RMkjVDRZzb`
- Model ID: `eleven_v3`

Change these in `.env` if you want a different ElevenLabs voice:

```bash
ELEVENLABS_VOICE_ID=...
ELEVENLABS_MODEL_ID=...
```

After restarting, Telegram replies should include generated voice output when the channel supports it.

## 7. Optional WhatsApp

The source machine also had WhatsApp enabled. To pair a fresh deployment:

```bash
docker compose exec openclaw bash
openclaw channels login --channel whatsapp
```

Follow the QR/pairing prompt. Set `WHATSAPP_ALLOW_FROM` in `.env` if you want an allowlist.

## 8. Optional Traefik

The original Compose file used Traefik labels. This repo keeps the labels but defaults them off.

Set:

```bash
TRAEFIK_ENABLE=true
TRAEFIK_HOST=your-domain.example
COMPOSE_PROJECT_NAME=openclaw
```

The router host becomes:

```text
openclaw.your-domain.example
```

## 9. Control UI and Pairing

Inside the container:

```bash
openclaw dashboard
openclaw qr --url http://127.0.0.1:18789
```

The generated config keeps the gateway bound to loopback. Do not expose the Control UI publicly without HTTPS, trusted proxy headers, and strong auth.

## 10. Maintenance

Update the container image:

```bash
docker compose pull
docker compose up -d
```

Useful diagnostics:

```bash
docker compose logs -f openclaw
docker compose exec openclaw openclaw doctor
docker compose exec openclaw openclaw status --deep
```

See [docs/remote-inventory.md](docs/remote-inventory.md) for the sanitized inventory copied from the working deployment.
