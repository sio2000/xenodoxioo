import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validation";
import { supabase } from "../lib/db";
import { sendInquiryNotificationEmail, sendInquiryReplyEmail } from "../services/email.service";

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────

const createInquirySchema = z.object({
  propertyId: z.string().uuid(),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  checkinDate: z.string(),
  checkoutDate: z.string(),
  guests: z.number().min(1),
  message: z.string().min(5),
});

const replySchema = z.object({
  message: z.string().min(1),
});

const guestReplySchema = z.object({
  guestEmail: z.string().email(),
  message: z.string().min(1),
});

// ── Guest: Create Inquiry (no auth) ────────────────────────────────

router.post("/", validate(createInquirySchema), async (req, res, next) => {
  try {
    const { propertyId, guestName, guestEmail, checkinDate, checkoutDate, guests, message } = req.body;

    const { data: inquiry, error } = await supabase
      .from("inquiries")
      .insert({
        property_id: propertyId,
        guest_name: guestName,
        guest_email: guestEmail,
        checkin_date: checkinDate,
        checkout_date: checkoutDate,
        guests,
        status: "NEW",
      })
      .select()
      .single();

    if (error || !inquiry) {
      console.error("[INQUIRY] Creation failed:", error);
      return res.status(500).json({ success: false, error: "Failed to create inquiry" });
    }

    await supabase.from("inquiry_messages").insert({
      inquiry_id: inquiry.id,
      sender_type: "guest",
      message,
    });

    // Send email notification to admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@leonidion-houses.com";
    const { data: property } = await supabase
      .from("properties")
      .select("name")
      .eq("id", propertyId)
      .single();

    sendInquiryNotificationEmail(
      adminEmail,
      {
        guest_name: guestName,
        guest_email: guestEmail,
        checkin_date: checkinDate,
        checkout_date: checkoutDate,
        guests,
      },
      property?.name || "Property",
    ).catch((err) => console.error("[INQUIRY] Email notification failed:", err));

    res.status(201).json({ success: true, data: { inquiryId: inquiry.id } });
  } catch (error) {
    next(error);
  }
});

// ── Guest: View Conversation (no auth, by inquiry ID + email) ──────

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = req.query.email as string;

    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("*, property:properties(name, location)")
      .eq("id", id)
      .single();

    if (!inquiry) {
      return res.status(404).json({ success: false, error: "Inquiry not found" });
    }

    if (email && inquiry.guest_email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const { data: messages } = await supabase
      .from("inquiry_messages")
      .select("*")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: true });

    res.json({
      success: true,
      data: {
        inquiry,
        messages: messages || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Guest: Reply to Inquiry (no auth) ──────────────────────────────

router.post("/:id/guest-reply", validate(guestReplySchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { guestEmail, message } = req.body;

    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("*")
      .eq("id", id)
      .single();

    if (!inquiry) {
      return res.status(404).json({ success: false, error: "Inquiry not found" });
    }

    if (inquiry.guest_email.toLowerCase() !== guestEmail.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    await supabase.from("inquiry_messages").insert({
      inquiry_id: id,
      sender_type: "guest",
      message,
    });

    await supabase
      .from("inquiries")
      .update({ status: "GUEST_REPLIED" })
      .eq("id", id);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ── Admin: List All Inquiries ──────────────────────────────────────

router.get("/admin/list", async (req, res, next) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    let query = supabase
      .from("inquiries")
      .select("*, property:properties(name, location)", { count: "exact" });

    if (status && status !== "ALL") query = query.eq("status", status);

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: {
        inquiries: data || [],
        total: count || 0,
        page,
        pageSize,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Admin: View Inquiry Detail ─────────────────────────────────────

router.get("/admin/:id", async (req, res, next) => {
  try {
    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("*, property:properties(name, location)")
      .eq("id", req.params.id)
      .single();

    if (!inquiry) {
      return res.status(404).json({ success: false, error: "Inquiry not found" });
    }

    const { data: messages } = await supabase
      .from("inquiry_messages")
      .select("*")
      .eq("inquiry_id", req.params.id)
      .order("created_at", { ascending: true });

    res.json({
      success: true,
      data: {
        inquiry,
        messages: messages || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Admin: Reply to Inquiry ────────────────────────────────────────

router.post("/admin/:id/reply", validate(replySchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("*")
      .eq("id", id)
      .single();

    if (!inquiry) {
      return res.status(404).json({ success: false, error: "Inquiry not found" });
    }

    await supabase.from("inquiry_messages").insert({
      inquiry_id: id,
      sender_type: "host",
      message,
    });

    await supabase
      .from("inquiries")
      .update({ status: "ANSWERED" })
      .eq("id", id);

    // Send reply email to guest
    const { data: property } = await supabase
      .from("properties")
      .select("name")
      .eq("id", inquiry.property_id)
      .single();

    sendInquiryReplyEmail(
      inquiry.guest_email,
      inquiry.guest_name,
      message,
      property?.name || "Property",
      id,
    ).catch((err) => console.error("[INQUIRY] Reply email failed:", err));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ── Admin: Mark Inquiry as Answered ────────────────────────────────

router.put("/admin/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    await supabase.from("inquiries").update({ status }).eq("id", req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export const inquiryRouter = router;
