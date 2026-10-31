import fs from "fs";
import path from "path";

export interface TicketReply {
  id: string;
  sender: "customer" | "agent" | "system";
  authorName: string;
  authorRole?: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  description: string;
  category: "api_bug" | "account_auth" | "billing_credits" | "self_hosted" | "security" | "feature_request" | "other";
  severity: "S1" | "S2" | "S3" | "S4";
  planTier: "self_hosted" | "developer" | "free";
  status: "New" | "Open" | "Waiting on Customer" | "Waiting on Engineering" | "Resolved" | "Closed";
  email: string;
  requestId?: string;
  assignedAgent?: string;
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

const DATA_DIR = path.join(process.cwd(), "..", "..", "data");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");

// Default seed tickets demonstrating real engineering support scenarios
const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: "t_01",
    reference: "OCR-2026-4812",
    subject: "Intermittent timeout on 34-page financial audit PDF",
    description: "When processing a 34-page financial audit statement via the /api/v1/extract endpoint, the request intermittently times out at 30 seconds. We are using a Developer Pro key.",
    category: "api_bug",
    severity: "S2",
    planTier: "developer",
    status: "Waiting on Customer",
    email: "cto@northstar-financial.com",
    requestId: "req_88f910a241b",
    assignedAgent: "Dr. Sarah Chen (Pipeline Lead)",
    createdAt: "2026-10-28 14:22 UTC",
    updatedAt: "2026-10-28 16:45 UTC",
    replies: [
      {
        id: "rep_01",
        sender: "customer",
        authorName: "Alex Vance (Northstar)",
        message: "When processing a 34-page financial audit statement via the /api/v1/extract endpoint, the request intermittently times out at 30 seconds.",
        createdAt: "2026-10-28 14:22 UTC",
      },
      {
        id: "rep_02",
        sender: "agent",
        authorName: "Dr. Sarah Chen (Pipeline Lead)",
        authorRole: "Core Engine Engineer",
        message: "Thanks for reporting this Alex. On documents over 30 pages, multi-threaded CPU page batching can exceed the default 30s gateway timeout if table matrix clustering is enabled. We have increased worker concurrency. Could you provide the job ID so we can verify the Docling layout logs?",
        createdAt: "2026-10-28 16:45 UTC",
      },
    ],
  },
  {
    id: "t_02",
    reference: "OCR-2026-3901",
    subject: "Helm chart MinIO cluster credential configuration question",
    description: "Deploying the air-gapped Helm chart in an offline Kubernetes cluster. We need to point worker pods to an internal MinIO S3 bucket without internet egress.",
    category: "self_hosted",
    severity: "S3",
    planTier: "self_hosted",
    status: "Resolved",
    email: "devops@apex-defense.org",
    requestId: "req_helm_71029",
    assignedAgent: "Marcus Brody (DevOps)",
    createdAt: "2026-10-25 09:15 UTC",
    updatedAt: "2026-10-25 11:30 UTC",
    replies: [
      {
        id: "rep_03",
        sender: "customer",
        authorName: "David K. (Apex Defense)",
        message: "Deploying the air-gapped Helm chart in an offline Kubernetes cluster. We need to point worker pods to an internal MinIO S3 bucket without internet egress.",
        createdAt: "2026-10-25 09:15 UTC",
      },
      {
        id: "rep_04",
        sender: "agent",
        authorName: "Marcus Brody (DevOps)",
        authorRole: "Infrastructure Lead",
        message: "Resolved. In values.yaml, set minio.s3_endpoint_url: 'http://minio.storage.svc:9000' and enable s3_force_path_style: true. The OCR engine will stream entirely over cluster-internal networking with zero external DNS lookups.",
        createdAt: "2026-10-25 11:30 UTC",
      },
      {
        id: "rep_05",
        sender: "system",
        authorName: "System Automation",
        message: "Ticket marked as Resolved by Marcus Brody.",
        createdAt: "2026-10-25 11:30 UTC",
      },
    ],
  },
  {
    id: "t_03",
    reference: "OCR-2026-1049",
    subject: "Arabic & Urdu multi-column receipt character spacing",
    description: "We are scanning retail invoices from Lahore and Karachi. Some Urdu Nastaliq headings have trailing spaces between connected glyphs.",
    category: "api_bug",
    severity: "S1",
    planTier: "self_hosted",
    status: "Waiting on Engineering",
    email: "tech@pakistan-retail.pk",
    requestId: "req_lahore_441",
    assignedAgent: "Zainab Malik (NLP & Scripts)",
    createdAt: "2026-10-30 08:10 UTC",
    updatedAt: "2026-10-30 13:00 UTC",
    replies: [
      {
        id: "rep_06",
        sender: "customer",
        authorName: "Usman Tariq",
        message: "We are scanning retail invoices from Lahore and Karachi. Some Urdu Nastaliq headings have trailing spaces between connected glyphs.",
        createdAt: "2026-10-30 08:10 UTC",
      },
      {
        id: "rep_07",
        sender: "agent",
        authorName: "Zainab Malik",
        authorRole: "NLP & Scripts Engineer",
        message: "Escalated to S1. RapidOCR's Arabic text line clusterer was splitting ligatures when font size fell below 9pt. We have patched the character bounding box merger in extract_cli.py. A hotfix build will be released today.",
        createdAt: "2026-10-30 13:00 UTC",
      },
    ],
  },
  {
    id: "t_04",
    reference: "OCR-2026-7284",
    subject: "Evaluation key credit top-up for enterprise proof of concept",
    description: "Our compliance team is evaluating the air-gap engine for 5,000 archival scans this week. Requesting credit allocation extension.",
    category: "billing_credits",
    severity: "S4",
    planTier: "developer",
    status: "New",
    email: "director@fintech-ventures.co",
    createdAt: "2026-10-31 16:30 UTC",
    updatedAt: "2026-10-31 16:30 UTC",
    replies: [
      {
        id: "rep_08",
        sender: "customer",
        authorName: "Rachel Greene",
        message: "Our compliance team is evaluating the air-gap engine for 5,000 archival scans this week. Requesting credit allocation extension.",
        createdAt: "2026-10-31 16:30 UTC",
      },
    ],
  },
];

function ensureStorage(): SupportTicket[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(TICKETS_FILE)) {
      fs.writeFileSync(TICKETS_FILE, JSON.stringify(INITIAL_TICKETS, null, 2), "utf8");
      return INITIAL_TICKETS;
    }
    const data = fs.readFileSync(TICKETS_FILE, "utf8");
    return JSON.parse(data) as SupportTicket[];
  } catch (err) {
    console.error("Failed to read tickets storage:", err);
    return INITIAL_TICKETS;
  }
}

function saveStorage(tickets: SupportTicket[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write tickets storage:", err);
  }
}

export function getAllTickets(): SupportTicket[] {
  const tickets = ensureStorage();
  return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTicketByRefOrId(query: string): SupportTicket | null {
  const tickets = ensureStorage();
  const clean = query.trim().toLowerCase();
  return tickets.find(
    (t) => t.id.toLowerCase() === clean || t.reference.toLowerCase() === clean
  ) || null;
}

export function createTicket(data: {
  subject: string;
  description: string;
  category: SupportTicket["category"];
  severity: SupportTicket["severity"];
  planTier?: SupportTicket["planTier"];
  email: string;
  requestId?: string;
}): SupportTicket {
  const tickets = ensureStorage();
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").substring(0, 16) + " UTC";

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const ref = `OCR-2026-${randomNum}`;
  const id = `t_${Date.now()}`;

  const newTicket: SupportTicket = {
    id,
    reference: ref,
    subject: data.subject.trim(),
    description: data.description.trim(),
    category: data.category || "api_bug",
    severity: data.severity || "S3",
    planTier: data.planTier || "developer",
    status: "New",
    email: data.email.trim(),
    requestId: data.requestId?.trim() || undefined,
    createdAt: dateStr,
    updatedAt: dateStr,
    replies: [
      {
        id: `rep_${Date.now()}`,
        sender: "customer",
        authorName: data.email.split("@")[0],
        message: data.description.trim(),
        createdAt: dateStr,
      },
      {
        id: `rep_sys_${Date.now() + 1}`,
        sender: "system",
        authorName: "OpenOCR Dispatcher",
        message: `Ticket registered with ${data.severity} priority in ${
          data.planTier === "self_hosted"
            ? "Enterprise SLA"
            : data.planTier === "developer"
            ? "Developer Priority"
            : "Community"
        } queue. Core engineering notified.`,
        createdAt: dateStr,
      },
    ],
  };

  tickets.unshift(newTicket);
  saveStorage(tickets);
  return newTicket;
}

export function updateTicketStatus(
  id: string,
  status: SupportTicket["status"],
  agentName = "Support Operations"
): SupportTicket | null {
  const tickets = ensureStorage();
  const ticket = tickets.find((t) => t.id === id || t.reference.toLowerCase() === id.toLowerCase());
  if (!ticket) return null;

  const now = new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC";
  ticket.status = status;
  ticket.updatedAt = now;

  ticket.replies.push({
    id: `rep_sys_${Date.now()}`,
    sender: "system",
    authorName: "System",
    message: `Ticket status updated to "${status}" by ${agentName}.`,
    createdAt: now,
  });

  saveStorage(tickets);
  return ticket;
}

export function addStaffReply(
  id: string,
  data: {
    message: string;
    authorName: string;
    authorRole?: string;
    newStatus?: SupportTicket["status"];
  }
): SupportTicket | null {
  const tickets = ensureStorage();
  const ticket = tickets.find((t) => t.id === id || t.reference.toLowerCase() === id.toLowerCase());
  if (!ticket) return null;

  const now = new Date().toISOString().replace("T", " ").substring(0, 16) + " UTC";
  ticket.updatedAt = now;

  if (data.newStatus) {
    ticket.status = data.newStatus;
  } else if (ticket.status === "New") {
    ticket.status = "Open";
  }

  ticket.replies.push({
    id: `rep_${Date.now()}`,
    sender: "agent",
    authorName: data.authorName || "OCR Support Engineer",
    authorRole: data.authorRole || "Core Platform Engineering",
    message: data.message.trim(),
    createdAt: now,
  });

  saveStorage(tickets);
  return ticket;
}
