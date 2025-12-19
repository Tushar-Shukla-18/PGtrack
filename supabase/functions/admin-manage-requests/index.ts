import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovePayload {
  action: "approve";
  requestId: string;
  temporaryPassword: string;
  sendNotification?: boolean;
}

interface RejectPayload {
  action: "reject";
  requestId: string;
  reason?: string;
}

interface ResetPasswordPayload {
  action: "reset-password";
  userId: string;
  newPassword: string;
}

interface DisableManagerPayload {
  action: "disable-manager";
  userId: string;
}

interface EnableManagerPayload {
  action: "enable-manager";
  userId: string;
}

type ActionPayload = ApprovePayload | RejectPayload | ResetPasswordPayload | DisableManagerPayload | EnableManagerPayload;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authorization" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if user is admin (super_admin)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "super_admin";

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const payload: ActionPayload = await req.json();

    // Handle reset-password action
    if (payload.action === "reset-password") {
      const { userId, newPassword } = payload;

      if (!newPassword || newPassword.length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: "Password must be at least 6 characters" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log(`[admin] Resetting password for user: ${userId}`);

      const { error: resetError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (resetError) {
        console.error("[admin] Failed to reset password:", resetError);
        return new Response(
          JSON.stringify({ success: false, error: resetError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log(`[admin] Password reset successful for user: ${userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Password reset successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Handle disable-manager action
    if (payload.action === "disable-manager") {
      const { userId } = payload;

      console.log(`[admin] Disabling manager: ${userId}`);

      // Update profile to mark as disabled
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_disabled: true })
        .eq("id", userId)
        .eq("role", "manager"); // Only allow disabling managers

      if (updateError) {
        console.error("[admin] Failed to disable manager:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Also disable the auth user to prevent login
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // ~100 years (effectively permanent)
      });

      if (authUpdateError) {
        console.error("[admin] Failed to ban user auth:", authUpdateError);
        // Rollback profile change
        await supabase.from("profiles").update({ is_disabled: false }).eq("id", userId);
        return new Response(
          JSON.stringify({ success: false, error: authUpdateError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log(`[admin] Manager disabled: ${userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Manager disabled successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Handle enable-manager action
    if (payload.action === "enable-manager") {
      const { userId } = payload;

      console.log(`[admin] Enabling manager: ${userId}`);

      // Update profile to mark as enabled
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_disabled: false })
        .eq("id", userId)
        .eq("role", "manager");

      if (updateError) {
        console.error("[admin] Failed to enable manager:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Remove the auth ban
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });

      if (authUpdateError) {
        console.error("[admin] Failed to unban user auth:", authUpdateError);
        // Rollback profile change
        await supabase.from("profiles").update({ is_disabled: true }).eq("id", userId);
        return new Response(
          JSON.stringify({ success: false, error: authUpdateError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log(`[admin] Manager enabled: ${userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Manager enabled successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // For approve/reject actions, validate request exists
    const requestId = (payload as ApprovePayload | RejectPayload).requestId;
    
    const { data: request, error: fetchError } = await supabase
      .from("pending_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ success: false, error: "Request not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (request.status !== "pending") {
      return new Response(
        JSON.stringify({ success: false, error: `Request already ${request.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (payload.action === "approve") {
      const { temporaryPassword } = payload;

      if (!temporaryPassword || temporaryPassword.length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: "Temporary password must be at least 6 characters" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log(`[admin] Approving access request for: ${request.email}`);

      // Create the user account with manager role
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: request.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: request.full_name,
          phone: request.phone,
        },
      });

      if (createUserError) {
        console.error("[admin] Failed to create user:", createUserError);
        return new Response(
          JSON.stringify({ success: false, error: createUserError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Update request status
      await supabase
        .from("pending_requests")
        .update({
          status: "approved",
        })
        .eq("id", requestId);

      console.log(`[admin] User created: ${newUser.user?.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Access request approved and user account created",
          userId: newUser.user?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } else if (payload.action === "reject") {
      const { reason } = payload;

      console.log(`[admin] Rejecting access request for: ${request.email}`);

      // Update request status
      await supabase
        .from("pending_requests")
        .update({
          status: "rejected",
        })
        .eq("id", requestId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Access request rejected",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error: unknown) {
    console.error("[admin] Error in admin-manage-requests function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
