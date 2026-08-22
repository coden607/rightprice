# RightPrice protocols and agent interoperability

## MCP

`apps/mcp-server` uses the current split MCP TypeScript server package and provides stdio tools for shopping search, intent parsing, connector health and commission-allocation calculation.

MCP is the tool/data boundary: agents call deterministic RightPrice capabilities through tools rather than embedding business logic in prompts.

## A2A

RightPrice's internal agent roles are documented in `agents/AGENT_SYSTEM.md`. A2A should be introduced only when RightPrice actually exposes an independent remote agent service that needs cross-agent interoperability.

`agents/agent-card.template.json` is a deployment template, not a claim that an A2A task endpoint is already live. The production card must point at the deployed authenticated A2A service and be validated against the current A2A v1 schema before publication.

## ACP / coding agents

ACP is treated as a development-environment concern rather than shopping runtime infrastructure. `AGENTS.md` and `.agents/skills/` provide the durable project instructions that coding agents should follow regardless of editor or coding-agent transport.

## API

The consumer PWA uses normal Next.js HTTP APIs. An OpenAPI description is in `docs/openapi.yaml`.
