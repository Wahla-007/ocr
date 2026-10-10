export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedField {
  key: string;
  label?: string;
  value: string | number | boolean | null;
  confidence: number;
  page?: number;
  bbox?: BoundingBox | null;
}

export interface ParsedTable {
  page: number;
  rows: string[][];
  markdown?: string;
  bbox?: BoundingBox | null;
}

export interface ParsedBlock {
  type: string;
  text: string;
  page: number;
  confidence: number;
  bbox?: BoundingBox | null;
}

export interface StructuredSupplier {
  name: string | null;
  pan?: string | null;
  gstin?: string | null;
  address: string | null;
  email?: string | null;
  website?: string | null;
}

export interface StructuredBuyer {
  name: string | null;
  pan?: string | null;
  gstin?: string | null;
  address: string | null;
}

export interface StructuredLineItem {
  description: string;
  details?: string | null;
  hsn_sac?: string | null;
  quantity: number;
  unit?: string | null;
  rate: number;
  amount: number;
  field_status?: Record<string, string>;
}

export interface StructuredTax {
  rate: number;
  amount: number;
  type: string;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  total: number;
}

export interface StructuredInvoice {
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  supplier: StructuredSupplier;
  buyer: StructuredBuyer;
  line_items: StructuredLineItem[];
  subtotal: number;
  tax: StructuredTax;
  round_off?: number | null;
  total: number;
  currency: string;
  place_of_supply?: string | null;
  payment_terms?: string | null;
  purchase_order_number?: string | null;
  amount_in_words?: string | null;
  additional_fields?: Array<{ label: string; value: string }>;
}

export interface StructuredIdentity {
  id_type: string;
  id_number: string | null;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth: string | null;
  expiry_date?: string | null;
  issue_date?: string | null;
  nationality?: string | null;
  gender?: string | null;
  license_class?: string | null;
  issuing_authority?: string | null;
  address?: string | null;
  photo_present?: boolean;
  restrictions?: string | null;
  endorsements?: string | null;
}

export interface StructuredReceipt {
  merchant_name: string | null;
  cashier?: string | null;
  receipt_date: string | null;
  line_items: StructuredLineItem[];
  subtotal: number;
  tax?: StructuredTax;
  total: number;
  currency: string;
  payment_method?: string | null;
}

export interface StructuredContract {
  title: string | null;
  parties: Array<{ role: string; name: string }>;
  effective_date: string | null;
  termination_date?: string | null;
  governing_law?: string | null;
  subject?: string | null;
  clauses_count?: number;
}

export interface StructuredGenericDocument {
  title: string | null;
  category?: string | null;
  author?: string | null;
  date?: string | null;
  page_count?: number;
  summary?: string | null;
  content?: string | null;
  attributes?: Record<string, any>;
  sections?: string[];
}

export interface StructuredAddress {
  line1: string | null;
  line2?: string | null;
  city: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  country: string | null;
}

export interface StructuredFields {
  document_number?: string | null;
  name?: {
    full: string | null;
    first?: string | null;
    last?: string | null;
  };
  address?: StructuredAddress;
  issued_on?: string | null;
  expiry_date?: string | null;
  date_of_birth?: string | null;
  photo_present?: boolean;
  gender?: string | null;
  nationality?: string | null;
  invoice?: StructuredInvoice;
  id_card?: StructuredIdentity;
  driving_license?: StructuredIdentity;
  receipt?: StructuredReceipt;
  contract?: StructuredContract;
  document?: StructuredGenericDocument;
  [key: string]: any;
}

export interface ValidationCheck {
  name: string;
  severity: string;
  passed: boolean;
  status: string;
  detail: string;
}

export interface DocumentValidation {
  is_valid: boolean;
  status: string;
  strength: string;
  checks: ValidationCheck[];
}

export interface ExtractionResult {
  id?: string;
  pages?: number;
  document_type?: string;
  detected_type?: string;
  type_match?: boolean;
  doc_type: string;
  doc_type_confidence?: number;
  overall_confidence?: number;
  summary?: string;
  brand_name?: string | null;
  vendor_name?: string | null;
  customer_name?: string | null;
  invoice_number?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  subtotal?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  detected_lines?: string[];
  raw_text?: string;
  fields: StructuredFields | ExtractedField[];
  raw_fields?: ExtractedField[];
  extra_fields?: Array<{ key: string; label: string; value: any; confidence?: number }>;
  custom_extraction?: any;
  validation?: DocumentValidation;
  warnings?: string[];
  usage?: {
    credits: number;
    remaining_today: number;
  };
  tables?: ParsedTable[];
  blocks?: ParsedBlock[];
  preview_image?: string;
  page_sizes?: { page: number; width: number; height: number }[];
  markdown?: string;
  text?: string;
  engine_version?: string;
  schema_version?: string;
  prompt_version?: string;
  cached?: boolean;
  credits_charged?: number;
  latency_ms?: number;
  page_count: number;
}

export interface PipelineProgress {
  stage: "idle" | "uploading" | "normalizing" | "parsing" | "classifying" | "extracting" | "completed" | "error";
  progressPercent: number;
  message: string;
  elapsedMs: number;
  error?: string;
}

export interface SampleDocument {
  id: string;
  title: string;
  fileName: string;
  docType: string;
  mimeType: string;
  pageCount: number;
  previewUrl: string;
  previewSvg?: string;
  result: ExtractionResult;
}
