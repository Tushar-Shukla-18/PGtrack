import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Building2,
  Save,
  MessageCircle,
  QrCode,
  Download,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Profile() {
  const { profile, updateProfile, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    pg_name: "",
  });
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        pg_name: profile.pg_name || "",
      });
      setWhatsappConsent(profile.whatsapp_consent || false);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
        pg_name: formData.pg_name,
        whatsapp_consent: whatsappConsent,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (!formData.full_name) return "??";
    return formData.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Profile" subtitle="Manage your account settings" showCampusFilter={false} />
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header title="Profile" subtitle="Manage your account settings" showCampusFilter={false} />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Profile Info */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{getInitials()}</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Profile Information</h2>
                <p className="text-sm text-muted-foreground">Update your account details</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pgName" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  PG Name
                </Label>
                <Input
                  id="pgName"
                  value={formData.pg_name}
                  onChange={(e) => setFormData({ ...formData, pg_name: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>

        {/* WhatsApp Settings */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">WhatsApp Integration</h2>
                <p className="text-sm text-muted-foreground">Manage WhatsApp notification settings</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Consent Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">WhatsApp Notifications Consent</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    I consent to send WhatsApp messages (reminders & payment updates) to my tenants.
                  </p>
                </div>
              </div>
              <Switch
                checked={whatsappConsent}
                onCheckedChange={setWhatsappConsent}
              />
            </div>

            <Separator />

            {/* QR Code Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Tenant Opt-in QR Code
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Share this QR code with your tenants. When they scan it and send the prefilled message, 
                they'll be opted in to receive WhatsApp reminders from you.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="p-4 bg-background border border-border rounded-xl">
                  <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">QR Code Preview</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-foreground mb-2">Instructions for tenants:</p>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Scan this QR code with your phone camera</li>
                      <li>It will open WhatsApp with a pre-filled message</li>
                      <li>Send the message to activate payment reminders</li>
                    </ol>
                  </div>

                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
