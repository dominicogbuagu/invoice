import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { xhrPost, BACKEND_URL } from "@/lib/xhr";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        console.error('No session_id found');
        navigate('/');
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const result = await xhrPost(`${BACKEND_URL}/api/auth/session`, null);
        // Note: session_id was passed as header in old flow
        if (!result.ok) {
          throw new Error('Authentication failed');
        }
        
        navigate('/dashboard', { 
          replace: true,
          state: { user: result.data?.user }
        });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    processAuth();
  }, [navigate, location.hash]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#0066cc] border-t-transparent rounded-full mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Signing you in...</h2>
        <p className="text-slate-500">Please wait while we complete authentication</p>
      </div>
    </div>
  );
}
