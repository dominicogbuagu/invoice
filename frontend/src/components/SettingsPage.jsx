import { useState, useRef, useEffect } from "react";
import { Upload, X, Save, Building2, Mail, Phone, Globe, Image, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PDF_TEMPLATES = {
  classic: { name: "Classic Blue", header_color: "#0066cc", accent_color: "#0052a3" },
  modern: { name: "Modern Dark", header_color: "#1e293b", accent_color: "#3b82f6" },
  minimal: { name: "Minimal Grey", header_color: "#64748b", accent_color: "#475569" },
  emerald: { name: "Emerald Green", header_color: "#059669", accent_color: "#047857" },
  crimson: { name: "Crimson Red", header_color: "#dc2626", accent_color: "#b91c1c" }
};

export default function SettingsPage({ user, setUser, onUpgrade }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(user?.pdf_template || "classic");
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || "",
    company_details: {
      name: user?.company_details?.name || "Realtouch Global Ventures Ltd",
      trading_name: user?.company_details?.trading_name || "",
      registration_number: user?.company_details?.registration_number || "16578193",
      address: user?.company_details?.address || "",
      email: user?.company_details?.email || "",
      phone: user?.company_details?.phone || "",
      website: user?.company_details?.website || "",
      tagline: user?.company_details?.tagline || ""
    }
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save');
      
      const updatedUser = await response.json();
      setUser(updatedUser);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BACKEND_URL}/api/user/upload-logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      setUser({ ...user, company_logo: result.logo });
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/logo`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Delete failed');
      
      setUser({ ...user, company_logo: null });
      toast.success("Logo deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete logo");
    }
  };

  return (
    <div className="max-w-3xl" data-testid="settings-page">
      <h2 className="font-space-mono text-2xl font-bold text-slate-900 mb-6">Settings</h2>
      
      {/* Profile Information */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#0066cc]" />
          Profile Information
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Your Name</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div>
            <Label className="text-sm">Email</Label>
            <Input value={user?.email || ''} disabled className="bg-slate-50" />
          </div>
        </div>
      </div>

      {/* Company Logo */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Image className="w-5 h-5 text-[#0066cc]" />
          Company Logo
        </h3>
        <div className="flex items-center gap-6">
          {user?.company_logo ? (
            <div className="relative">
              <img 
                src={user.company_logo} 
                alt="Company Logo" 
                className="w-24 h-24 object-contain border rounded-lg"
              />
              <button
                onClick={handleDeleteLogo}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                title="Remove logo"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400">
              <Image size={32} />
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="upload-logo-btn"
            >
              {uploading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-[#0066cc] border-t-transparent rounded-full mr-2"></span>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {user?.company_logo ? 'Change Logo' : 'Upload Logo'}
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 mt-2">PNG, JPG up to 2MB. Will appear on invoices.</p>
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#0066cc]" />
          Company Details (Default for Invoices)
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Legal Company Name</Label>
            <Input 
              value={formData.company_details.name}
              onChange={(e) => setFormData({
                ...formData,
                company_details: { ...formData.company_details, name: e.target.value }
              })}
              placeholder="Realtouch Global Ventures Ltd"
              data-testid="company-name-input"
            />
          </div>
          <div>
            <Label className="text-sm">Trading Name (Optional)</Label>
            <Input 
              value={formData.company_details.trading_name}
              onChange={(e) => setFormData({
                ...formData,
                company_details: { ...formData.company_details, trading_name: e.target.value }
              })}
              placeholder="e.g., Realtouch Research and Consulting"
              data-testid="trading-name-input"
            />
          </div>
          <div>
            <Label className="text-sm">Registration Number</Label>
            <Input 
              value={formData.company_details.registration_number}
              onChange={(e) => setFormData({
                ...formData,
                company_details: { ...formData.company_details, registration_number: e.target.value }
              })}
              placeholder="16578193"
            />
          </div>
          <div>
            <Label className="text-sm">Tagline (Optional)</Label>
            <Input 
              value={formData.company_details.tagline}
              onChange={(e) => setFormData({
                ...formData,
                company_details: { ...formData.company_details, tagline: e.target.value }
              })}
              placeholder="Empowering Growth. Delivering Impact."
            />
          </div>
          <div>
            <Label className="text-sm">Email</Label>
            <Input 
              type="email"
              value={formData.company_details.email}
              onChange={(e) => setFormData({
                ...formData,
                company_details: { ...formData.company_details, email: e.target.value }
              })}
              placeholder="contact@company.com"
            />
          </div>
          <div>
            <Label className="text-sm">Phone</Label>
            <Input 
              value={formData.company_details.phone}
              onChange={(e) => setFormData({
                ...formData,
                company_details: { ...formData.company_details, phone: e.target.value }
              })}
              placeholder="+44 123 456 7890"
            />
          </div>
          <div>
            <Label className="text-sm">Website</Label>
            <Input 
              value={formData.company_details.website}
              onChange={(e) => setFormData({
                ...formData,
                company_details: { ...formData.company_details, website: e.target.value }
              })}
              placeholder="www.company.com"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-sm">Address</Label>
            <Textarea 
              value={formData.company_details.address}
              onChange={(e) => setFormData({
                ...formData,
                company_details: { ...formData.company_details, address: e.target.value }
              })}
              placeholder="Company address"
              rows={2}
            />
          </div>
        </div>
        
        <Button 
          onClick={handleSave}
          className="mt-6 bg-[#0066cc] hover:bg-[#0052a3] text-white"
          disabled={saving}
          data-testid="save-settings-btn"
        >
          {saving ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* PDF Template Customization */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#0066cc]" />
          PDF Template
        </h3>
        <p className="text-sm text-slate-500 mb-4">Choose a color theme for your generated PDF invoices.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(PDF_TEMPLATES).map(([id, template]) => (
            <button
              key={id}
              onClick={async () => {
                setSelectedTemplate(id);
                try {
                  const res = await fetch(`${BACKEND_URL}/api/user/pdf-template`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ template_id: id })
                  });
                  if (res.ok) {
                    setUser({ ...user, pdf_template: id });
                    toast.success(`Template set to ${template.name}`);
                  }
                } catch (err) {
                  toast.error("Failed to update template");
                }
              }}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                selectedTemplate === id
                  ? "border-[#0066cc] ring-2 ring-blue-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              data-testid={`template-${id}`}
            >
              <div className="flex gap-1 justify-center mb-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: template.header_color }}></div>
                <div className="w-6 h-6 rounded" style={{ backgroundColor: template.accent_color }}></div>
              </div>
              <p className="text-xs font-medium text-slate-700">{template.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Subscription */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Subscription</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">
              {user?.plan === "starter" ? "Starter Plan" : 
               user?.plan === "professional" ? "Professional Plan" : "Enterprise Plan"}
            </p>
            <p className="text-sm text-slate-500">
              {user?.plan === "starter" 
                ? "5 downloads total (permanent limit)" 
                : "Unlimited downloads"}
            </p>
          </div>
          {user?.plan === "starter" && (
            <Button 
              onClick={onUpgrade}
              className="bg-[#0066cc] hover:bg-[#0052a3] text-white"
              data-testid="settings-upgrade-btn"
            >
              Upgrade
            </Button>
          )}
        </div>
      </div>

      {/* Deployment Guide */}
      <div className="card p-6 mt-6 bg-slate-50">
        <h3 className="font-semibold text-slate-900 mb-4">Production Deployment Guide</h3>
        <div className="space-y-4 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-700 mb-1">1. Stripe Configuration</p>
            <p>Replace test keys in <code className="bg-slate-200 px-1 rounded">backend/.env</code>:</p>
            <pre className="bg-slate-200 p-2 rounded mt-1 text-xs overflow-x-auto">
STRIPE_API_KEY=sk_live_your_production_key
            </pre>
          </div>
          <div>
            <p className="font-medium text-slate-700 mb-1">2. Email Configuration (Resend)</p>
            <p>Add your Resend API key:</p>
            <pre className="bg-slate-200 p-2 rounded mt-1 text-xs overflow-x-auto">
RESEND_API_KEY=re_your_api_key
SENDER_EMAIL=invoices@yourdomain.com
            </pre>
          </div>
          <div>
            <p className="font-medium text-slate-700 mb-1">3. Database</p>
            <p>Update <code className="bg-slate-200 px-1 rounded">MONGO_URL</code> to your production MongoDB.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700 mb-1">4. Custom Domain</p>
            <p>Update frontend <code className="bg-slate-200 px-1 rounded">REACT_APP_BACKEND_URL</code> to your backend URL.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
