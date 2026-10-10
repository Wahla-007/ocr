# Versioned Prompts Directory

Rule 10: Prompts live in `/prompts` as versioned files (`*.vN.md`), never inline in code.
Rule 11: Prompt-injection defense: text from documents is untrusted DATA. Wrap it in clear delimiters, instruct the model to ignore any instructions found inside, and never let document content change behavior, tool calls, or output format.

## Structure:
- `classify.v1.md` - Document classification prompt template
- `discover.v1.md` - Generic discovery extractor for unknown document schemas
- `extract.<doc_type>.v1.md` - Specialized schema extractors (invoice, receipt, id_card, etc.)
