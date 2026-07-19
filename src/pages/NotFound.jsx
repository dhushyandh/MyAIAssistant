import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { HelpCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col justify-center items-center px-6 selection:bg-blue-100">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto">
          <HelpCircle size={32} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404 — Not Found</h1>
          <p className="text-sm text-gray-500 font-light leading-relaxed">
            The space you are trying to reach doesn't exist. Let Airo guide you back to the active interfaces.
          </p>
        </div>

        <div>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-black hover:bg-gray-900 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <ArrowLeft size={14} />
            <span>Back to Airo Home</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
