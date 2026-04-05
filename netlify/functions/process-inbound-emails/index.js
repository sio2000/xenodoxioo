const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const FORWARD_TO = ["ggmericas@yahoo.com", "leonidionhouses@yahoo.com"];
const FORWARDED_FLAG = "$LHForwarded";

exports.handler = async function () {
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;

  if (!user || !pass) {
    console.log("[INBOUND] IMAP credentials not configured, skipping");
    return { statusCode: 200, body: "IMAP not configured" };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.FROM_EMAIL || "info@leonidionhouses.com";
  const fromName = process.env.FROM_NAME || "LEONIDIONHOUSES";
  const infoAddr = (process.env.IMAP_USER || "info@leonidionhouses.com").toLowerCase();

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || "mail.privateemail.com",
    port: Number(process.env.IMAP_PORT) || 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  let forwarded = 0;
  let inquiriesProcessed = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const uids = await client.search({ since: since }, { uid: true });

      if (!uids.length) {
        console.log("[INBOUND] No emails in last 2 hours");
        lock.release();
        await client.logout();
        return { statusCode: 200, body: "No recent emails" };
      }

      console.log("[INBOUND] Found " + uids.length + " email(s) from last 2 hours");

      for (const uid of uids) {
        try {
          let flags = [];
          try {
            const flagsResult = await client.fetchOne(uid, { flags: true }, { uid: true });
            flags = flagsResult?.flags ? Array.from(flagsResult.flags) : [];
          } catch (e) {
            console.warn("[INBOUND] UID " + uid + " could not fetch flags");
          }

          if (flags.includes(FORWARDED_FLAG)) {
            continue;
          }

          let source = null;

          try {
            const raw = await client.fetchOne(uid, { source: true }, { uid: true });
            if (raw && raw.source) {
              source = raw.source;
            }
          } catch (e) {
            console.warn("[INBOUND] UID " + uid + " fetchOne failed, trying download");
          }

          if (!source) {
            try {
              const { content } = await client.download(uid, undefined, { uid: true });
              const chunks = [];
              for await (const chunk of content) {
                chunks.push(chunk);
              }
              source = Buffer.concat(chunks);
            } catch (dlErr) {
              console.warn("[INBOUND] UID " + uid + " download also failed, skipping");
              continue;
            }
          }

          if (!source || source.length === 0) {
            console.warn("[INBOUND] UID " + uid + " empty source, skipping");
            continue;
          }

          const parsed = await simpleParser(source);
          const subject = parsed.subject || "";
          const senderAddr = parsed.from?.value?.[0]?.address || "";
          const senderName = parsed.from?.value?.[0]?.name || senderAddr;

          if (senderAddr.toLowerCase() === infoAddr) {
            try {
              await client.messageFlagsAdd(uid, [FORWARDED_FLAG], { uid: true });
            } catch (e) {}
            continue;
          }

          const htmlBody = parsed.html || parsed.textAsHtml || ("<pre>" + (parsed.text || "") + "</pre>");

          const fwdHtml =
            '<div style="font-family:sans-serif;color:#333">' +
              '<p style="color:#666;font-size:13px">' +
                "<strong>From:</strong> " + senderName + " &lt;" + senderAddr + "&gt;<br/>" +
                "<strong>Subject:</strong> " + subject + "<br/>" +
                "<strong>Date:</strong> " + (parsed.date ? parsed.date.toISOString() : "N/A") +
              "</p>" +
              "<hr style='border:none;border-top:1px solid #ddd'/>" +
              htmlBody +
            "</div>";

          for (const recipient of FORWARD_TO) {
            try {
              await resend.emails.send({
                from: fromName + " <" + fromEmail + ">",
                to: [recipient],
                replyTo: senderAddr,
                subject: "[FWD] " + subject,
                html: fwdHtml,
              });
            } catch (sendErr) {
              console.error("[INBOUND] Failed to forward to " + recipient + ":", sendErr?.message);
            }
          }

          try {
            await client.messageFlagsAdd(uid, [FORWARDED_FLAG], { uid: true });
          } catch (flagErr) {
            console.warn("[INBOUND] Could not set forwarded flag:", flagErr?.message);
          }

          forwarded++;
          console.log("[INBOUND] Forwarded email from " + senderAddr + ": " + subject);

          const inqMatch = subject.match(/\[INQ#([^\]]+)\]/);
          if (!inqMatch) {
            continue;
          }

          const inquiryId = inqMatch[1];
          const replyText = extractReplyText(parsed.text || "");

          if (!replyText.trim()) {
            continue;
          }

          const trimmedMessage = replyText.trim().slice(0, 10000);

          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          const { data: existing } = await supabase
            .from("inquiry_messages")
            .select("id")
            .eq("inquiry_id", inquiryId)
            .eq("sender_type", "guest")
            .eq("message", trimmedMessage)
            .gte("created_at", twoHoursAgo)
            .limit(1);

          if (existing && existing.length > 0) {
            continue;
          }

          const { data: inquiry } = await supabase
            .from("inquiries")
            .select("id, guest_email")
            .eq("id", inquiryId)
            .single();

          if (!inquiry) {
            console.warn("[INBOUND] Inquiry " + inquiryId + " not found, skipping");
            continue;
          }

          await supabase.from("inquiry_messages").insert({
            inquiry_id: inquiryId,
            sender_type: "guest",
            message: trimmedMessage,
          });

          await supabase
            .from("inquiries")
            .update({
              last_guest_message_at: new Date().toISOString(),
              status: "NEW",
            })
            .eq("id", inquiryId);

          inquiriesProcessed++;
          console.log("[INBOUND] Processed inquiry reply " + inquiryId);
        } catch (msgErr) {
          console.error("[INBOUND] Error processing UID " + uid + ":", msgErr?.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error("[INBOUND] IMAP error:", err?.message);
  }

  console.log("[INBOUND] Done — forwarded " + forwarded + ", inquiry replies " + inquiriesProcessed);
  return { statusCode: 200, body: JSON.stringify({ forwarded, inquiriesProcessed }) };
};

function extractReplyText(text) {
  if (!text) return "";

  const lines = text.split("\n");
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^On .+ wrote:\s*$/i.test(trimmed)) break;
    if (/^Στις .+ έγραψε:\s*$/i.test(trimmed)) break;
    if (/^-{3,}\s*Original Message/i.test(trimmed)) break;
    if (/^-{3,}\s*Forwarded message/i.test(trimmed)) break;
    if (/^From:\s/i.test(trimmed) && result.length > 0) break;
    if (trimmed.startsWith(">")) continue;

    result.push(line);
  }

  return result.join("\n").trim();
}
