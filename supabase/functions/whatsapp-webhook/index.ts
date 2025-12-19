import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * WhatsApp Webhook Handler
 * 
 * This webhook handles:
 * 1. GET requests for Meta webhook verification
 * 2. POST requests for incoming messages (tenant opt-in consent)
 * 
 * When a tenant sends their first message to the WhatsApp Business number,
 * this webhook marks them as opted-in for WhatsApp messages.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // GET request - Meta webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

    console.log("[whatsapp-webhook] Verification request:", { mode, token, challenge });

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[whatsapp-webhook] Verification successful");
      return new Response(challenge, { 
        status: 200, 
        headers: { "Content-Type": "text/plain" } 
      });
    } else {
      console.error("[whatsapp-webhook] Verification failed - token mismatch");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // POST request - Incoming message/status webhook
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[whatsapp-webhook] Incoming webhook:", JSON.stringify(body, null, 2));

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Process webhook entries
      const entries = body.entry || [];
      
      for (const entry of entries) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          const value = change.value;
          
          // Handle incoming messages (tenant opt-in)
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              const senderPhone = message.from;
              const messageText = message.text?.body || "";
              const messageType = message.type;

              console.log("[whatsapp-webhook] Message from:", senderPhone, "Type:", messageType, "Text:", messageText);

              // Normalize phone number (remove country code for matching)
              let normalizedPhone = senderPhone;
              if (normalizedPhone.startsWith("91")) {
                normalizedPhone = normalizedPhone.slice(2);
              }

              // Find tenant by phone number
              const { data: tenant, error: tenantError } = await supabase
                .from("tenants")
                .select("id, full_name, phone, whatsapp_optin, user_id")
                .or(`phone.eq.${senderPhone},phone.eq.${normalizedPhone},phone.eq.+91${normalizedPhone}`)
                .maybeSingle();

              if (tenantError) {
                console.error("[whatsapp-webhook] Error finding tenant:", tenantError);
                continue;
              }

              if (!tenant) {
                console.log("[whatsapp-webhook] No tenant found for phone:", senderPhone);
                continue;
              }

              console.log("[whatsapp-webhook] Found tenant:", tenant.full_name, "Current opt-in:", tenant.whatsapp_optin);

              // Update tenant opt-in status if not already opted in
              if (!tenant.whatsapp_optin) {
                const { error: updateError } = await supabase
                  .from("tenants")
                  .update({
                    whatsapp_optin: true,
                    meta_optin_confirmed: true,
                    updated_at: new Date().toISOString()
                  })
                  .eq("id", tenant.id);

                if (updateError) {
                  console.error("[whatsapp-webhook] Error updating tenant opt-in:", updateError);
                } else {
                  console.log("[whatsapp-webhook] Tenant opt-in updated successfully:", tenant.full_name);
                  
                  // Log the opt-in event
                  await supabase.from("whatsapp_logs").insert({
                    user_id: tenant.user_id,
                    tenant_id: tenant.id,
                    message_type: "opt_in",
                    status: "received",
                    phone: senderPhone,
                    template_name: null,
                    error_message: `Tenant initiated WhatsApp consent: "${messageText.substring(0, 100)}"`
                  });
                }
              }
            }
          }

          // Handle message status updates (delivered, read, etc.)
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              console.log("[whatsapp-webhook] Status update:", status.status, "for:", status.recipient_id);
              // Could log delivery/read receipts here if needed
            }
          }
        }
      }

      // Always return 200 to acknowledge receipt
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error("[whatsapp-webhook] Error processing webhook:", error);
      // Still return 200 to prevent Meta from retrying
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
