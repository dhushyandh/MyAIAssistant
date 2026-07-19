import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SignIn as ClerkSignIn, SignUp as ClerkSignUp } from "@clerk/clerk-react";
import { motion } from "motion/react";
import { Sparkles, Github, Globe, Mail, Chrome, ArrowRight, ExternalLink } from "lucide-react";
import { useMockAuthActions, useUser } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const mockAuth = useMockAuthActions();
  const { isSignedIn, isLoaded } = useUser();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "" });
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isIframe = window.self !== window.top;

  useEffect(() => {
    if (CLERK_PUBLISHABLE_KEY && isLoaded && isSignedIn) {
      showToast("Welcome back! Redirecting you to Airo...", "success");
      navigate("/chat", { state: location.state });
    }
  }, [isSignedIn, isLoaded, navigate, showToast, location.state]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMockLogin = (e) => {
    e.preventDefault();
    if (!formData.email) {
      setErrorMsg("Email is required");
      showToast("Email is required to sign in", "error");
      return;
    }
    const namePart = formData.firstName || "Guest";
    const lastPart = formData.lastName || "Explorer";
    mockAuth.login({
      firstName: namePart,
      lastName: lastPart,
      email: formData.email,
    });
    showToast(`Welcome back, ${namePart}! Entering Airo Workspace...`, "success");
    navigate("/chat", { state: location.state });
  };

  const handleMockOAuth = (provider) => {
    const firstName = provider === "Google" ? "Alex" : "Dev";
    mockAuth.login({
      firstName: firstName,
      lastName: provider === "Google" ? "Mercer" : "GitHubber",
      email: `${provider.toLowerCase()}@dhushyandh.me`,
      imageUrl: provider === "Google" 
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"
        : "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120"
    });
    showToast(`Signed in successfully via ${provider}!`, "success");
    navigate("/chat", { state: location.state });
  };

  const handleOpenNewTab = () => {
    showToast("Opening secure Clerk authorization portal in a new tab...", "info");
    window.open(window.location.origin + "/auth", "_blank");
  };

  return (
    <div id="auth-page" className="min-h-screen bg-gray-50/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <LinkToHome />
        <h2 className="mt-6 text-3xl font-extrabold text-black tracking-tight">
          {CLERK_PUBLISHABLE_KEY ? "Sign in to Airo" : "Airo Sandbox Sign In"}
        </h2>
        <p className="mt-2 text-sm text-gray-400 font-normal">
          {CLERK_PUBLISHABLE_KEY 
            ? "Access Dhushyandh's secure AI portfolio interface" 
            : "No Clerk key provided—explore Airo instantly via sandbox accounts!"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-gray-100 shadow-sm sm:rounded-2xl sm:px-10">
          {CLERK_PUBLISHABLE_KEY ? (
            isIframe ? (
              // Display elegant helper for Iframe context to prevent Clerk block
              <div className="space-y-6 text-center py-4">
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100 text-amber-800 text-xs leading-relaxed space-y-2">
                  <p className="font-semibold">Security sandbox constraint active</p>
                  <p className="font-light">
                    Browsers protect Clerk session cookies from being transmitted inside cross-origin iframe previews, resulting in connection blocks.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={handleOpenNewTab}
                    className="w-full py-3 rounded-xl bg-black hover:bg-gray-800 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span>Open in New Tab to Sign In</span>
                    <ExternalLink size={13} />
                  </button>
                  
                  <p className="text-[10px] text-gray-400 font-light">
                    After signing in on the secure tab, you can return to this window.
                  </p>
                </div>
              </div>
            ) : (
              // Real Clerk Sign In (for top-level window/tabs)
              <div className="flex justify-center">
                <ClerkSignIn afterSignInUrl="/chat" signUpUrl="/auth?signUp=true" />
              </div>
            )
          ) : (
            // Mock sandbox authentication
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleMockOAuth("Google")}
                  className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-100 rounded-xl bg-white text-sm font-medium text-gray-500 hover:bg-gray-50/50 hover:border-gray-200 transition-all gap-2 items-center cursor-pointer"
                >
                  <Chrome size={16} className="text-red-500" />
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMockOAuth("GitHub")}
                  className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-100 rounded-xl bg-white text-sm font-medium text-gray-500 hover:bg-gray-50/50 hover:border-gray-200 transition-all gap-2 items-center cursor-pointer"
                >
                  <Github size={16} className="text-black" />
                  <span>GitHub</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
                  <span className="bg-white px-3 text-gray-400">Or continue with</span>
                </div>
              </div>

              <form onSubmit={handleMockLogin} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      First Name
                    </label>
                    <input
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Jane"
                      className="w-full px-4 py-2.5 border border-gray-100 rounded-xl text-xs bg-gray-50/50 text-black focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <input
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      className="w-full px-4 py-2.5 border border-gray-100 rounded-xl text-xs bg-gray-50/50 text-black focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                     name="email"
                     type="email"
                     required
                     value={formData.email}
                     onChange={handleInputChange}
                     placeholder="recruiter@company.com"
                     className="w-full px-4 py-2.5 border border-gray-100 rounded-xl text-xs bg-gray-50/50 text-black focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder-gray-400"
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-500 font-medium">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-black hover:bg-gray-800 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer"
                >
                  <span>Access Assistant</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkToHome() {
  const navigate = useNavigate();
  return (
    <div className="flex justify-center cursor-pointer" onClick={() => navigate("/")}>
      <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-white shadow-sm hover:opacity-90 transition-opacity">
        <span className="font-extrabold text-lg leading-none">AI</span>
      </div>
    </div>
  );
}
