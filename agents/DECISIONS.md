# Decisions Log

Record durable production decisions here so later agents do not have to rediscover them.

## Decision Template

```md
### YYYY-MM-DD - [Decision Title]

- Decision:
- Context:
- Alternatives considered:
- Consequences:
- Applies to:
- Revisit when:
```

## Current Decisions

### 2026-06-17 - Local-First Pipeline Folder

- Decision: Keep the Lemonteed Production Pipeline in `/agents` as local workflow documentation.
- Context: The project needs a repeatable planning, execution, review, and handoff system before connecting similar workflows to LocAIly and Leymons.
- Alternatives considered: Embedding the workflow only in root agent instructions or public Studio pages.
- Consequences: The workflow is visible to local agents and maintainers without changing public site behavior.
- Applies to: Lemonteed development, design, content, and QA work.
- Revisit when: The workflow is integrated with external project systems or automation.
