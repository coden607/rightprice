# AGENTS.md — RightPrice coding rules

Before modifying RightPrice, read `agents/AGENT_SYSTEM.md` and relevant `.agents/skills/*/SKILL.md` files.

Non-negotiables:
- shopper utility outranks affiliate revenue;
- no fabricated prices, shipping estimates, credentials, approvals or integrations;
- product identity and offer identity are distinct;
- conflicting strong product identifiers must not auto-merge;
- money/accounting is deterministic and append-only;
- recruitment alone never earns a reward;
- second-level referrals stay feature-flagged off unless separately approved;
- retailer-specific logic belongs in connectors;
- failures in one connector should not break valid results from others;
- any security or compliance regression blocks release.


## Shared skills catalog
Use the repository coden607/skills as the shared skills catalog. Before substantive work, automatically select the relevant skills for the task. Keep these project-specific instructions authoritative when they are more specific. Only use tools and integrations that are actually available in the current runtime.

## Shared agent skills

Canonical library: https://github.com/coden607/skills

For every agent session in this project:
1. Read this project's instructions before planning or editing.
2. Reuse or clone the complete canonical skills library, sync it before selecting skills, and inspect the relevant SKILL.md files. Do not install just a hand-picked subset.
3. Select skills according to the task; do not execute all skills automatically. Follow their instructions within the current user's authorization and this project's safety and product rules.
4. Keep this policy usable by Codex/ChatGPT, Claude Code, Gemini CLI, Copilot, Kimi, OpenClaw, Chatty and other agents. Agents without automatic instruction discovery must load AGENTS.md explicitly.
5. Never put credentials, private customer data or secrets in skills, prompts, commits or logs.
6. Prefer the canonical library over divergent copied skills. Installing a skill does not authorize sending messages, changing customer systems, deployments, billing or other external actions.

This is persistent project guidance. It does not prove that an AI service or remote machine has the library installed.
