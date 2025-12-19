import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password, full_name } = await req.json();

    // Validate required fields
    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ success: false, error: "Email, password, and full_name are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if any super_admin already exists
    const { data: existingAdmin } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "super_admin")
      .limit(1)
      .maybeSingle();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "A super admin already exists. Use the login page." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    console.log(`Creating super admin: ${email}`);

    // Create the super admin user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Update the profile to set role as super_admin
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ 
        role: "super_admin",
        full_name: full_name.trim(),
      })
      .eq("id", authUser.user.id);

    if (profileError) {
      console.error("Profile error:", profileError);
      // Profile might be created by trigger, try upsert
      await supabase
        .from("profiles")
        .upsert({ 
          id: authUser.user.id,
          email: email.toLowerCase().trim(),
          role: "super_admin",
          full_name: full_name.trim(),
        });
    }

    console.log(`Super admin created successfully: ${authUser.user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Super admin created successfully",
        email: email.toLowerCase().trim()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    console.error("Bootstrap error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
