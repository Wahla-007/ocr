import { NextRequest, NextResponse } from "next/server";
import {
  getAllTickets,
  getTicketByRefOrId,
  createTicket,
  updateTicketStatus,
  addStaffReply,
  SupportTicket,
} from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get("ref");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const search = searchParams.get("search");

    if (ref) {
      const ticket = getTicketByRefOrId(ref);
      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found", ref }, { status: 404 });
      }
      return NextResponse.json({ ticket });
    }

    let tickets = getAllTickets();

    if (status && status !== "all") {
      tickets = tickets.filter(
        (t) => t.status.toLowerCase() === status.toLowerCase()
      );
    }

    if (severity && severity !== "all") {
      tickets = tickets.filter(
        (t) => t.severity.toLowerCase() === severity.toLowerCase()
      );
    }

    if (search) {
      const q = search.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.reference.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    // Compute stats
    const stats = {
      total: tickets.length,
      new: tickets.filter((t) => t.status === "New").length,
      open: tickets.filter((t) => t.status === "Open").length,
      waitingEngineering: tickets.filter((t) => t.status === "Waiting on Engineering").length,
      waitingCustomer: tickets.filter((t) => t.status === "Waiting on Customer").length,
      resolved: tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length,
      urgentS1: tickets.filter((t) => t.severity === "S1").length,
    };

    return NextResponse.json({ tickets, stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { subject, description, category, severity, email, requestId, planTier } = body;

    if (!subject || !description || !email) {
      return NextResponse.json(
        { error: "Missing required fields: subject, description, and email are required." },
        { status: 400 }
      );
    }

    const ticket = createTicket({
      subject,
      description,
      category: category || "api_bug",
      severity: severity || "S3",
      email,
      requestId,
      planTier: planTier || "developer",
    });

    return NextResponse.json(
      {
        message: "Support ticket registered successfully",
        ticket,
        trackingUrl: `/support?tab=track&ref=${ticket.reference}`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, status, reply, authorName, authorRole } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ticket id" }, { status: 400 });
    }

    let updated: SupportTicket | null = null;

    if (reply && reply.trim()) {
      updated = addStaffReply(id, {
        message: reply,
        authorName: authorName || "Support Engineer",
        authorRole: authorRole || "Platform Engineering",
        newStatus: status,
      });
    } else if (status) {
      updated = updateTicketStatus(id, status, authorName || "Support Operations");
    }

    if (!updated) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Ticket updated successfully",
      ticket: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
