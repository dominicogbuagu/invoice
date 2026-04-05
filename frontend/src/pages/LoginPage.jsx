import { useState } from "react";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleLogin } from "@react-oauth/google";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const xhrPost = (url, body) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    const token = localStorage.getItem("session_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch (_) {}
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error("Network error. Please check your connection and try again."));
    xhr.send(JSON.stringify(body));
  });
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    try {
      const result = await xhrPost(`${BACKEND_URL}/api/auth/google`, { credential: credentialResponse.credential });
      if (!result.ok) {
        throw new Error(result.data.detail || "Google authentication failed");
      }
      if (result.data.session_token) {
        localStorage.setItem("session_token", result.data.session_token);
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in failed. Please try again.");
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
    const payload = isSignup 
      ? { name: formData.name, email: formData.email, password: formData.password }
      : { email: formData.email, password: formData.password };

    try {
      const result = await xhrPost(`${BACKEND_URL}${endpoint}`, payload);
      if (!result.ok) {
        throw new Error(result.data.detail || "Authentication failed. Please try again.");
      }
      if (result.data.session_token) {
        localStorage.setItem("session_token", result.data.session_token);
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute font-mono text-[80px] font-bold text-slate-900 select-none"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            >
              £
            </div>
          ))}
        </div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-[#0066cc] to-[#0052a3] p-8 text-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_92c54f79-469e-43bd-a9c6-e17155f9fa52/artifacts/vr15jpmc_image.png"
              alt="Realtouch Invoice Logo"
              className="h-24 w-auto mx-auto mb-4 object-contain"
            />
            <h1 className="font-space-mono text-2xl font-bold text-white">
              Realtouch Invoice
            </h1>
            <p className="text-blue-100 text-sm mt-2">
              Professional Invoicing, Simplified Globally
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                {isSignup ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-slate-500 text-sm">
                {isSignup 
                  ? "Sign up to start creating invoices" 
                  : "Sign in to access your invoicing dashboard"}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="pl-10"
                      required={isSignup}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white py-5 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {isSignup ? "Creating Account..." : "Signing In..."}
                  </>
                ) : (
                  isSignup ? "Create Account" : "Sign In"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400">or continue with</span>
              </div>
            </div>

            {/* Google Login Button */}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                width="100%"
                text={isSignup ? "signup_with" : "signin_with"}
                shape="rectangular"
              />
            </div>

            {/* Toggle Login/Signup */}
            <div className="mt-6 text-center text-sm text-slate-500">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <button 
                    onClick={() => {setIsSignup(false); setError("");}}
                    className="text-[#0066cc] hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <button 
                    onClick={() => {setIsSignup(true); setError("");}}
                    className="text-[#0066cc] hover:underline font-medium"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* Info */}
            <div className="mt-6 space-y-2 text-xs text-slate-400 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>Your data is encrypted and secure</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>5 free downloads to start</span>
              </div>
            </div>

            {/* Back Link */}
            <button 
              onClick={handleBack}
              className="w-full mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-[#0066cc] transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to homepage
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-slate-400 text-xs">
            Realtouch Global Ventures Ltd • Company No. 16578193
          </p>
          <p className="text-slate-400 text-xs mt-1">
            © 2025 All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
