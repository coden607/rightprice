# Shared coden607 skills

RightPrice uses the canonical skills repository at:

https://github.com/coden607/skills

Run:

```bash
./scripts/bootstrap-shared-skills.sh
```

The script clones or fast-syncs the **complete** catalog into
`.runtime-skills/coden607` without loading every skill into model context.
Agents must then select only the smallest relevant set of `SKILL.md` files for
the task, per `AGENTS.md`.

The runtime copy is disposable and must not contain credentials or project
secrets.
