# Document Schemas Directory

Rule 3: Auto-detect flow: classify first. If the type matches a known schema, run that schema extractor. If unknown, run the generic DISCOVERY extractor. Adding a document type must only require adding a schema file and a prompt file, never changing the pipeline or UI.

## Structure:
- `<doc_type>.json` - JSON Schema specifying fields, types, and labels for known document types (invoice, receipt, id_card, bank_statement, resume, purchase_order, contract, form).
