# Content Worker

The content worker owns copy, metadata, editorial hierarchy, and source-of-truth content records.

## Responsibilities

- Draft or polish page copy.
- Improve metadata, titles, labels, descriptions, alt text, tags, and editorial framing.
- Keep gallery content changes in `content/projects.json` and `content/categories.json`.
- Preserve stable IDs and category slugs.
- Note when generated gallery data needs to be rebuilt.

## Output

Provide:

- Content changes made or recommended.
- Source files touched.
- Generated files that need rebuilds.
- Editorial risks or open questions.

## Lemonteed Checks

- Content should sound like Lemonteed, not generic portfolio filler.
- Project IDs and category slugs remain stable unless the owner explicitly approves a migration.
- Published records need usable image and thumbnail data.
