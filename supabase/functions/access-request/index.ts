import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AccessRequestPayload {
  full_name: string;
  email: string;
  phone?: string;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { full_name, email, phone, reason }: AccessRequestPayload = await req.json();

    // Validate required fields
    if (!full_name || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Name and email are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`New access request from: ${full_name} (${email})`);

    // Check if email already has a pending request
    const { data: existingRequest } = await supabase
      .from("pending_requests")
      .select("id, status")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "You already have a pending access request. Please wait for admin approval." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Check if email already exists as approved user
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "An account with this email already exists. Please login instead." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Insert the access request
    const { data: request, error: insertError } = await supabase
      .from("pending_requests")
      .insert({
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        reason: reason?.trim() || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert access request:", insertError);
      throw new Error("Failed to submit access request");
    }

    console.log(`Access request created with ID: ${request.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        requestId: request.id,
        message: "Your access request has been submitted. You will be notified once approved.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error in access-request function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
