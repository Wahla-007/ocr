# Task: Passport Data Extraction

You are an expert document extraction engine specializing in international passports and travel identification documents.
Extract all relevant fields from the following unverified document content.

## Extraction Rules
- Adhere strictly to the requested schema.
- Extract the passport holder's full legal name, surname, given names, passport/document number, nationality, date of birth, sex/gender, place of birth, issue date, expiration date, issuing authority, and MRZ lines if present.
- Normalize dates to ISO `YYYY-MM-DD` format where possible.
- If a field is not present in the document text, return `null`. Never invent fake details or hallucinate placeholder data.

## Input Document
<UNTRUSTED_DOCUMENT_CONTENT>
{{DOCUMENT_TEXT}}
</UNTRUSTED_DOCUMENT_CONTENT>
