import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking");
  const [attempts, setAttempts] = useState(0);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      navigate("/dashboard");
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/payments/stripe/status/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}` }
        });

        if (!response.ok) {
          throw new Error('Failed to check payment status');
        }

        const data = await response.json();

        if (data.payment_status === "paid") {
          setStatus("success");
        } else if (data.status === "expired") {
          setStatus("expired");
        } else if (attempts < 5) {
          // Continue polling
          setTimeout(() => setAttempts(prev => prev + 1), 2000);
        } else {
          setStatus("timeout");
        }
      } catch (error) {
        console.error("Payment status check error:", error);
        if (attempts < 5) {
          setTimeout(() => setAttempts(prev => prev + 1), 2000);
        } else {
          setStatus("error");
        }
      }
    };

    checkPaymentStatus();
  }, [sessionId, attempts, navigate]);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#0066cc] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Processing your payment...</h2>
          <p className="text-slate-500">Please wait while we confirm your upgrade</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="font-space-mono text-2xl font-bold text-slate-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-slate-600 mb-8">
            Thank you for upgrading! Your account has been upgraded and your download limit has been reset. You now have unlimited downloads.
          </p>
          <Button 
            onClick={() => navigate("/dashboard")}
            className="bg-[#0066cc] hover:bg-[#0052a3] text-white px-8"
            data-testid="continue-to-dashboard-btn"
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          {status === "expired" ? "Session Expired" : "Something went wrong"}
        </h1>
        <p className="text-slate-600 mb-8">
          {status === "expired" 
            ? "Your payment session has expired. Please try again."
            : "We couldn't confirm your payment. Please check your account or contact support."}
        </p>
        <Button 
          onClick={() => navigate("/dashboard")}
          className="bg-[#0066cc] hover:bg-[#0052a3] text-white px-8"
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
