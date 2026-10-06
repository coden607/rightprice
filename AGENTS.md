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
