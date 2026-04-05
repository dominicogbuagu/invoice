import { useState } from "react";
import { X, Check, CreditCard, AlertCircle, Lock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { xhrPost, BACKEND_URL } from "@/lib/xhr";

export default function UpgradeModal({ onClose, user, downloadsUsed }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const plans = [
    {
      id: "professional",
      name: "Professional",
      price: "£5",
      period: "/month",
      features: [
        "Unlimited downloads",
        "All document types",
        "Payment integration",
        "Custom branding",
        "Email invoices",
        "Priority support"
      ]
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "£49.90",
      period: "/month",
      features: [
        "Everything in Professional",
        "Multi-user access",
        "API access",
        "Advanced analytics",
        "Recurring invoices",
        "Dedicated account manager"
      ]
    }
  ];

  const handleUpgrade = async () => {
    setLoading(true);

    try {
      const originUrl = window.location.origin;

      const result = await xhrPost(`${BACKEND_URL}/api/payments/stripe/create-checkout`, {
        plan: selectedPlan,
        origin_url: originUrl,
        payment_method: paymentMethod
      });

      if (!result.ok) {
        throw new Error('Failed to create checkout session');
      }

      window.location.href = result.data.url;
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-space-mono text-xl font-bold text-slate-900">Download Limit Reached</h2>
              <p className="text-sm text-slate-500">You&apos;ve used all {downloadsUsed} free downloads</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            data-testid="close-upgrade-modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> The free download limit is <strong>permanent</strong>, not monthly. 
              Upgrade to continue downloading unlimited invoices.
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 mb-3">What you&apos;ll get:</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-5 h-5 text-emerald-500" />
                Unlimited downloads (PDF & JPEG)
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-5 h-5 text-emerald-500" />
                Email invoices directly to customers
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-5 h-5 text-emerald-500" />
                Custom branding & logo
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-5 h-5 text-emerald-500" />
                Recurring invoices
              </li>
            </ul>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 mb-3">Select Payment Method:</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod("card")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "card" 
                    ? "border-[#0066cc] bg-blue-50" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
                data-testid="payment-method-card"
              >
                <CreditCard className="w-6 h-6 mx-auto mb-2 text-[#0066cc]" />
                <p className="text-sm font-medium">Credit Card</p>
                <p className="text-xs text-slate-500">via Stripe</p>
              </button>
              <button
                onClick={() => setPaymentMethod("bacs_debit")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "bacs_debit" 
                    ? "border-[#0066cc] bg-blue-50" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
                data-testid="payment-method-direct-debit"
              >
                <Building2 className="w-6 h-6 mx-auto mb-2 text-[#0066cc]" />
                <p className="text-sm font-medium">Direct Debit</p>
                <p className="text-xs text-slate-500">UK BACS</p>
              </button>
              <button
                onClick={() => setPaymentMethod("google_pay")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === "google_pay" 
                    ? "border-[#0066cc] bg-blue-50" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
                data-testid="payment-method-gpay"
              >
                <div className="w-6 h-6 mx-auto mb-2 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <p className="text-sm font-medium">Google Pay</p>
                <p className="text-xs text-slate-500">Fast checkout</p>
              </button>
            </div>
          </div>

          {/* Plan Selection */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  selectedPlan === plan.id 
                    ? "border-[#0066cc] bg-blue-50" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
                data-testid={`plan-${plan.id}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-space-mono font-bold text-slate-900">{plan.name}</h4>
                  {selectedPlan === plan.id && (
                    <div className="w-6 h-6 bg-[#0066cc] rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <span className="font-space-mono text-2xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {/* CTA */}
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white py-6 text-lg"
            disabled={loading}
            data-testid="upgrade-now-btn"
          >
            {loading ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                Processing...
              </>
            ) : (
              <>
                Upgrade to {selectedPlan === "professional" ? "Professional" : "Enterprise"}
                {paymentMethod === "bacs_debit" && " via Direct Debit"}
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-500">
            <Lock className="w-4 h-4" />
            <span>Secure payment · Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
