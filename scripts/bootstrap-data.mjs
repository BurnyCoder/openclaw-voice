#!/usr/bin/env node
import { chmod, cp, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const envPath = path.join(repoRoot, ".env");
const dataRoot = path.join(repoRoot, "data");
const openclawRoot = path.join(dataRoot, ".openclaw");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const text = readFileSync(filePath, "utf8");
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

const env = { ...parseEnvFile(envPath), ...process.env };

function envRef(id) {
  return { source: "env", provider: "default", id };
}

function boolEnv(name, fallback) {
  const value = env[name];
  if (value === undefined || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function stringEnv(name, fallback = "") {
  return env[name] && !env[name].startsWith("replace-with-") ? env[name] : fallback;
}

function csvEnv(name) {
  return String(env[name] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function copyMissing(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  for (const entry of await readdir(srcDir)) {
    const src = path.join(srcDir, entry);
    const dest = path.join(destDir, entry);
    const info = await stat(src);
    if (info.isDirectory()) {
      await copyMissing(src, dest);
      continue;
    }
    if (!existsSync(dest)) {
      await cp(src, dest);
    }
  }
}

const allowedOrigins = [
  "http://localhost:18789",
  "http://127.0.0.1:18789",
  ...csvEnv("OPENCLAW_CONTROL_UI_ALLOWED_ORIGINS"),
];

const config = {
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      selfChatMode: true,
      allowFrom: csvEnv("WHATSAPP_ALLOW_FROM"),
      groupAllowFrom: [],
      groupPolicy: "allowlist",
      debounceMs: 0,
      mediaMaxMb: 50,
      enabled: boolEnv("WHATSAPP_ENABLED", true),
    },
    telegram: {
      enabled: true,
      groups: {
        "*": {
          requireMention: boolEnv("TELEGRAM_REQUIRE_MENTION", true),
        },
      },
      botToken: envRef("TELEGRAM_BOT_TOKEN"),
    },
  },
  update: {
    channel: "stable",
    checkOnStart: false,
  },
  browser: {
    headless: true,
    noSandbox: true,
    defaultProfile: "openclaw",
  },
  commands: {
    bash: true,
    native: "auto",
    nativeSkills: "auto",
    restart: true,
  },
  tools: {
    profile: "full",
    elevated: {
      enabled: boolEnv("OPENCLAW_ELEVATED_TOOLS", false),
      allowFrom: {
        webchat: csvEnv("OPENCLAW_ELEVATED_WEBCHAT_ALLOW_FROM"),
      },
    },
  },
  agents: {
    list: [{ id: "main", name: "main" }],
    defaults: {
      workspace: "/data/.openclaw/workspace",
      model: {
        primary: stringEnv("OPENCLAW_MODEL_PRIMARY", "ChatGPT 5.4"),
      },
      models: {
        "openai/gpt-5.4": { alias: "ChatGPT 5.4" },
        "openai/gpt-5.4-pro": { alias: "ChatGPT 5.4 Pro" },
        "openai/gpt-5.2": { alias: "ChatGPT 5.2" },
        "openai/gpt-5.1-codex": { alias: "ChatGPT 5.1 Codex" },
        "openai/gpt-4.1": { alias: "ChatGPT 4.1" },
      },
      thinkingDefault: stringEnv("OPENCLAW_THINKING_DEFAULT", "low"),
    },
  },
  gateway: {
    mode: "local",
    controlUi: {
      allowedOrigins,
      allowInsecureAuth: boolEnv("OPENCLAW_CONTROL_UI_ALLOW_INSECURE_AUTH", false),
    },
    auth: {
      mode: "token",
      token: envRef("OPENCLAW_GATEWAY_TOKEN"),
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
      },
    },
    remote: {
      token: envRef("OPENCLAW_GATEWAY_TOKEN"),
    },
    port: 18789,
    bind: "loopback",
    tailscale: {
      mode: "off",
      resetOnExit: false,
    },
  },
  plugins: {
    entries: {
      whatsapp: { enabled: true },
      openai: { enabled: true },
      browser: { enabled: true },
      telegram: { enabled: true },
    },
  },
  skills: {
    load: {
      extraDirs: ["/data/.openclaw/skills"],
    },
    entries: {
      hhmail: { enabled: true },
      sag: {
        apiKey: envRef("ELEVENLABS_API_KEY"),
      },
    },
  },
  models: {
    mode: "merge",
  },
  hooks: {
    token: "${OPENCLAW_HOOKS_TOKEN}",
  },
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          apiKey: envRef("ELEVENLABS_API_KEY"),
          voiceId: stringEnv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb"),
          modelId: stringEnv("ELEVENLABS_MODEL_ID", "eleven_v3"),
        },
      },
    },
  },
};

await mkdir(openclawRoot, { recursive: true });
await writeFile(
  path.join(openclawRoot, "openclaw.json"),
  `${JSON.stringify(config, null, 2)}\n`,
);
await chmod(path.join(openclawRoot, "openclaw.json"), 0o600);

await mkdir(path.join(openclawRoot, "credentials"), { recursive: true });
await writeFile(
  path.join(openclawRoot, "credentials", "telegram-default-allowFrom.json"),
  `${JSON.stringify({ version: 1, allowFrom: csvEnv("TELEGRAM_ALLOW_FROM") }, null, 2)}\n`,
);
await writeFile(
  path.join(openclawRoot, "credentials", "telegram-pairing.json"),
  `${JSON.stringify({ version: 1, requests: [] }, null, 2)}\n`,
);

await mkdir(path.join(openclawRoot, "devices"), { recursive: true });
await writeFile(path.join(openclawRoot, "devices", "pending.json"), "{}\n");

await copyMissing(
  path.join(repoRoot, "templates", "workspace"),
  path.join(openclawRoot, "workspace"),
);

console.log("Seeded data/.openclaw/openclaw.json and workspace templates.");
console.log("Secrets are referenced from .env at runtime; they were not written into openclaw.json.");
