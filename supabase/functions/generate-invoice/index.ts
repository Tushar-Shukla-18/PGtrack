import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { billId, returnBase64 } = body as { billId?: string; returnBase64?: boolean };

    console.log("[generate-invoice] Generating for bill:", billId);

    if (!billId) {
      return new Response(
        JSON.stringify({ error: "billId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch bill with related data
    const { data: bill, error: billError } = await supabase
      .from("bills")
      .select(`
        *,
        tenants (full_name, phone, rooms (room_no)),
        campuses (name)
      `)
      .eq("id", billId)
      .single();

    if (billError || !bill) {
      console.error("[generate-invoice] Bill fetch error:", billError);
      return new Response(
        JSON.stringify({ error: "Bill not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Fetch manager profile
    const { data: manager } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", bill.user_id)
      .single();

    // Generate invoice number
    const invoiceNumber = `INV-${String(Date.now()).slice(-6)}`;
    const invoiceDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const billingPeriod = new Date(bill.bill_month).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const primaryColor = rgb(0.098, 0.463, 0.824); // Blue
    const grayColor = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const greenColor = rgb(0.133, 0.545, 0.133);
    const black = rgb(0, 0, 0);

    // Centered layout margins
    const contentWidth = 480;
    const leftMargin = (width - contentWidth) / 2; // ~57.5
    const rightEdge = leftMargin + contentWidth;

    let y = height - 50;

    // Header
    page.drawText("PGtrack", { x: leftMargin, y, size: 24, font: helveticaBold, color: primaryColor });
    // Center RECEIPT text on the page
    const receiptText = "RECEIPT";
    const receiptWidth = helveticaBold.widthOfTextAtSize(receiptText, 20);
    page.drawText(receiptText, { x: (width - receiptWidth) / 2, y, size: 20, font: helveticaBold, color: primaryColor });

    y -= 18;
    page.drawText("Professional PG Management System", { x: leftMargin, y, size: 10, font: helvetica, color: grayColor });

    // Invoice details (right side)
    page.drawText(`Invoice #: ${invoiceNumber}`, { x: rightEdge - 150, y: y + 15, size: 10, font: helvetica, color: grayColor });
    page.drawText(`Invoice Date: ${invoiceDate}`, { x: rightEdge - 150, y, size: 10, font: helvetica, color: grayColor });
    page.drawText(`Billing Period: ${billingPeriod}`, { x: rightEdge - 150, y: y - 15, size: 10, font: helvetica, color: grayColor });

    // Divider line
    y -= 40;
    page.drawLine({ start: { x: leftMargin, y }, end: { x: rightEdge, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

    // FROM section
    y -= 30;
    page.drawText("FROM", { x: leftMargin, y, size: 12, font: helveticaBold, color: primaryColor });
    y -= 22;
    page.drawText(bill.campuses?.name || "PG Name", { x: leftMargin, y, size: 14, font: helveticaBold, color: black });
    y -= 18;
    page.drawText(`Owner: ${manager?.full_name || "Manager"}`, { x: leftMargin, y, size: 10, font: helvetica, color: grayColor });
    y -= 15;
    if (manager?.email) {
      page.drawText(`Email: ${manager.email}`, { x: leftMargin, y, size: 10, font: helvetica, color: grayColor });
      y -= 15;
    }
    if (manager?.phone) {
      page.drawText(`Contact: +91 ${manager.phone}`, { x: leftMargin, y, size: 10, font: helvetica, color: grayColor });
    }

    // TO section
    y -= 35;
    page.drawText("TO", { x: leftMargin, y, size: 12, font: helveticaBold, color: primaryColor });
    y -= 22;
    page.drawText(bill.tenants?.full_name || "Tenant", { x: leftMargin, y, size: 14, font: helveticaBold, color: black });
    y -= 18;
    page.drawText(`Room: ${bill.tenants?.rooms?.room_no || "N/A"}`, { x: leftMargin, y, size: 10, font: helvetica, color: grayColor });
    y -= 15;
    if (bill.tenants?.phone) {
      page.drawText(`Phone: +91 ${bill.tenants.phone}`, { x: leftMargin, y, size: 10, font: helvetica, color: grayColor });
    }

    // Amount table header
    y -= 40;
    page.drawRectangle({ x: leftMargin, y: y - 8, width: contentWidth, height: 28, color: lightGray });
    page.drawText("DESCRIPTION", { x: leftMargin + 10, y: y - 2, size: 10, font: helveticaBold, color: black });
    page.drawText("AMOUNT", { x: rightEdge - 80, y: y - 2, size: 10, font: helveticaBold, color: black });

    y -= 35;

    // Bill items
    const items = [
      { desc: "Rent Amount", amount: bill.rent_amount },
      { desc: "Electricity Charges", amount: bill.electricity_amount },
      { desc: "Water Charges", amount: bill.water_amount },
      { desc: "Other Charges", amount: bill.other_charges },
    ].filter((item) => item.amount > 0);

    for (const item of items) {
      page.drawText(item.desc, { x: leftMargin + 10, y, size: 10, font: helvetica, color: black });
      page.drawText(`Rs.${item.amount.toLocaleString("en-IN")}`, { x: rightEdge - 80, y, size: 10, font: helvetica, color: black });
      y -= 22;
    }

    // Total row
    y -= 5;
    page.drawLine({ start: { x: leftMargin, y: y + 18 }, end: { x: rightEdge, y: y + 18 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
    page.drawText("Total Amount Paid", { x: leftMargin + 10, y, size: 12, font: helveticaBold, color: black });
    page.drawText(`Rs.${bill.total_amount.toLocaleString("en-IN")}`, { x: rightEdge - 80, y, size: 12, font: helveticaBold, color: primaryColor });

    // Payment received confirmation
    y -= 45;
    page.drawText("[PAID]", { x: leftMargin, y, size: 12, font: helveticaBold, color: greenColor });
    page.drawText("Payment Received Successfully", { x: leftMargin + 45, y, size: 14, font: helveticaBold, color: greenColor });

    // Payment details table
    y -= 40;
    page.drawRectangle({ x: leftMargin, y: y - 8, width: contentWidth, height: 28, color: lightGray });
    page.drawText("Payment Method", { x: leftMargin + 10, y: y - 2, size: 10, font: helveticaBold, color: black });
    page.drawText("Payment Date", { x: leftMargin + 180, y: y - 2, size: 10, font: helveticaBold, color: black });
    page.drawText("Status", { x: rightEdge - 80, y: y - 2, size: 10, font: helveticaBold, color: black });

    y -= 30;
    const paymentDate = bill.payment_date
      ? new Date(bill.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : invoiceDate;
    page.drawText(bill.payment_method || "Cash", { x: leftMargin + 10, y, size: 10, font: helvetica, color: black });
    page.drawText(paymentDate, { x: leftMargin + 180, y, size: 10, font: helvetica, color: black });
    page.drawText("PAID", { x: rightEdge - 80, y, size: 10, font: helveticaBold, color: greenColor });

    // Footer section
    y -= 70;
    page.drawLine({ start: { x: leftMargin, y: y + 35 }, end: { x: leftMargin + 130, y: y + 35 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    page.drawText("Authorized Signature", { x: leftMargin, y: y + 18, size: 10, font: helvetica, color: grayColor });
    page.drawText("PGtrack Management", { x: leftMargin, y: y + 3, size: 10, font: helveticaBold, color: black });

    y -= 25;
    page.drawText("This is a computer-generated invoice and does not require a physical signature.", {
      x: leftMargin,
      y,
      size: 8,
      font: helvetica,
      color: grayColor,
    });

    y -= 18;
    const generatedTime = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    page.drawText(`Generated by PGtrack | ${generatedTime}`, { x: leftMargin, y, size: 8, font: helvetica, color: grayColor });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfArrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;
    const pdfBase64 = returnBase64 ? base64Encode(pdfArrayBuffer) : null;

    // Upload to Supabase Storage
    const fileName = `invoice_${billId}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-invoice] Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload invoice", details: uploadError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("invoices").getPublicUrl(fileName);
    const invoiceUrl = urlData.publicUrl;

    console.log("[generate-invoice] Invoice generated:", invoiceUrl);

    const payload: Record<string, unknown> = { success: true, invoiceUrl, invoiceNumber };
    if (returnBase64) payload.pdfBase64 = pdfBase64;

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[generate-invoice] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
