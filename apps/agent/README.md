# Veil agent

This local service turns an EVM contract or invariant description into a reviewable RISC Zero guest draft. It uses an OpenAI-compatible chat-completions endpoint and refuses to fabricate a draft when no provider is configured.

```bash
cp .env.example .env
# fill AI_BASE_URL, AI_API_KEY, and AI_MODEL
set -a && source .env && set +a
npm start
```

The generated guest is a draft, not an audit. A human must compare its assertions with the deployed contract before compiling the ImageID or funding a bounty.
