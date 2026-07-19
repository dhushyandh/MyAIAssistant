import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  MessageSquare,
  ArrowRight,
  Code,
  FileText,
  Github,
  Linkedin,
  Globe,
  Mail,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Bookmark,
  ShieldAlert
} from "lucide-react";
import { DHUSHYANDH_PROFILE } from "../constants/dhushyandhData";
import { useUser } from "../context/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();

  const handleStartChat = () => {
    if (isSignedIn) {
      navigate("/chat");
    } else {
      navigate("/auth");
    }
  };

  const handleCardClick = (queryText) => {
    if (isSignedIn) {
      navigate("/chat", { state: { initialQuery: queryText } });
    } else {
      navigate("/auth", { state: { initialQuery: queryText } });
    }
  };

  return (
    <div id="home-page" className="min-h-screen bg-white text-black font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Navbar */}
      <nav id="nav-bar" className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link id="nav-logo" to="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white">
            <span className="font-extrabold text-base leading-none">AI</span>
          </div>
          <span>Airo</span>
        </Link>

        <div id="nav-links" className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link id="nav-link-portfolio" to="https://dhushyandh.me" className="hover:text-black transition-colors">Portfolio</Link>
          {isSignedIn ? (
            <Link id="nav-link-dashboard" to="/chat" className="px-4 py-2 rounded-xl bg-black text-white text-xs hover:bg-gray-800 transition-all flex items-center gap-1.5">
              <span>Go to Chat</span>
              <ArrowRight size={12} />
            </Link>
          ) : (
            <Link id="nav-link-login" to="/auth" className="px-4 py-2 rounded-xl border border-gray-200 text-black text-xs hover:bg-gray-50 transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="grow max-w-6xl mx-auto px-6 pt-16 pb-24 w-full">
        {/* Hero Section */}
        <div id="hero-section" className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600 font-semibold mb-6"
          >
            <Sparkles size={12} className="text-black" />
            <span>Meet Dhushyandh's AI Assistant</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-extrabold tracking-tight leading-none mb-6 text-black"
          >
            Meet <span className="text-black underline decoration-gray-400 decoration-wavy">Airo</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-500 font-normal leading-relaxed mb-10 max-w-xl mx-auto"
          >
            Explore My projects, skills, and experience.
            Ask anything and get instant AI-powered answers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              id="hero-chat-btn"
              onClick={handleStartChat}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-black hover:bg-gray-800 text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare size={16} />
              <span>Start Chat with Airo</span>
            </button>
            <Link
              id="hero-portfolio-btn"
              to="https://dhushyandh.me"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-black font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Portfolio</span>
              <ChevronRight size={16} />
            </Link>
          </motion.div>
        </div>

        {/* Feature Bento Grid Section */}
        <section id="features-section" className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-black">Capabilities at a Glance</h2>
            <p className="text-gray-400 font-normal text-sm">Airo goes beyond simple text templates. It's a deep knowledge engine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AI Assistant */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() => handleCardClick("Hi Airo! Tell me more about your capabilities and how we can chat about Dhushyandh.")}
              className="p-8 rounded-2xl bg-white border border-gray-100 flex flex-col justify-between group transition-all hover:border-black hover:shadow-sm cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-black mb-6">
                  <MessageSquare size={18} />
                </div>
                <h3 className="text-base font-bold text-black mb-2">AI Chat Assistant</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-light">
                  Engage in deep, context-aware conversations powered by state-of-the-art server-side Gemini intelligence.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1 text-xs font-bold text-black group-hover:underline">
                <span>Start chatting</span>
                <ChevronRight size={12} />
              </div>
            </motion.div>

            {/* Portfolio Knowledge */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() => handleCardClick("What are some of Dhushyandh's key areas of expertise and his software development journey?")}
              className="p-8 rounded-2xl bg-white border border-gray-100 flex flex-col justify-between group transition-all hover:border-black hover:shadow-sm cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-black mb-6">
                  <Layers size={18} />
                </div>
                <h3 className="text-base font-bold text-black mb-2">Portfolio Knowledge</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-light">
                  Deeply indexed RAG content on Dhushyandh's software journey, experience parameters, and tech preferences.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1 text-xs font-bold text-black group-hover:underline">
                <span>Explore credentials</span>
                <ChevronRight size={12} />
              </div>
            </motion.div>

            {/* Resume Q&A */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() => handleCardClick("Could you summarize Dhushyandh's resume, work experience, and educational background?")}
              className="p-8 rounded-2xl bg-white border border-gray-100 flex flex-col justify-between group transition-all hover:border-black hover:shadow-sm cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-black mb-6">
                  <FileText size={18} />
                </div>
                <h3 className="text-base font-bold text-black mb-2">Resume Q&A</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-light">
                  Have Airo analyze and explain specific sections of his curriculum vitae, achievements, or project workflows.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1 text-xs font-bold text-black group-hover:underline">
                <span>Ask about experience</span>
                <ChevronRight size={12} />
              </div>
            </motion.div>

            {/* Coding Assistant */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() => handleCardClick("How experienced is Dhushyandh in programming? Show me some tech stack examples.")}
              className="p-8 rounded-2xl bg-white border border-gray-100 flex flex-col justify-between group transition-all hover:border-black hover:shadow-sm cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-black mb-6">
                  <Code size={18} />
                </div>
                <h3 className="text-base font-bold text-black mb-2">Coding Assistant</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-light">
                  Test Dhushyandh's AI agent with coding questions, syntax reviews, or algorithmic challenges to prove technical capacity.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1 text-xs font-bold text-black group-hover:underline">
                <span>View codes</span>
                <ChevronRight size={12} />
              </div>
            </motion.div>

            {/* Project Showcase */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() => handleCardClick("Can you tell me about Dhushyandh's projects like Project Management App and AI Resume Analyzer?")}
              className="p-8 rounded-2xl bg-white border border-gray-100 flex flex-col justify-between group transition-all hover:border-black hover:shadow-sm cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-black mb-6">
                  <Bookmark size={18} />
                </div>
                <h3 className="text-base font-bold text-black mb-2">Project Showcase</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-light">
                  Get high-level details, architectural summaries, and direct repository reference links for projects like Project Management App , Ai Resume Analyser.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1 text-xs font-bold text-black group-hover:underline">
                <span>See showcase</span>
                <ChevronRight size={12} />
              </div>
            </motion.div>

            {/* Live Contact */}
            <motion.div
              whileHover={{ y: -3 }}
              onClick={() => handleCardClick("How can I contact or hire Dhushyandh? Tell me about his social and email coordinates.")}
              className="p-8 rounded-2xl bg-white border border-gray-100 flex flex-col justify-between group transition-all hover:border-black hover:shadow-sm cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-black mb-6">
                  <Mail size={18} />
                </div>
                <h3 className="text-base font-bold text-black mb-2">Get in Touch</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-light">
                  Instantly obtain contact methods, social addresses, or instruct Airo to format an email proposal directly.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1 text-xs font-bold text-black group-hover:underline">
                <span>View contacts</span>
                <ChevronRight size={12} />
              </div>
            </motion.div>
          </div>
        </section>

        {!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3 text-amber-800 text-sm mb-12"
          >
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer id="footer-section" className="bg-gray-50 border-t border-gray-100 py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="text-lg font-bold mb-2 tracking-tight">Airo</div>
            <p className="text-xs text-gray-400">Dhushyandh N's Intelligent Personal Agent Portfolio.</p>
          </div>

          <div className="flex flex-wrap gap-6 items-center justify-center text-sm font-medium text-gray-500">
            <a href={DHUSHYANDH_PROFILE.github} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors flex items-center gap-1">
              <Github size={14} />
              <span>GitHub</span>
            </a>
            <a href={DHUSHYANDH_PROFILE.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors flex items-center gap-1">
              <Linkedin size={14} />
              <span>LinkedIn</span>
            </a>
            <a href={DHUSHYANDH_PROFILE.portfolio} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors flex items-center gap-1">
              <Globe size={14} />
              <span>Portfolio</span>
            </a>
            <a href={`mailto:${DHUSHYANDH_PROFILE.email}`} className="hover:text-black transition-colors flex items-center gap-1">
              <Mail size={14} />
              <span>Email</span>
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-gray-200/50 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-4">
          <span>&copy; {new Date().getFullYear()} Dhushyandh N. All rights reserved.</span>
          <span>Minimal by design. Powerful by purpose.
            <a href="https://chat.dhushyandh.me" className="hover:text-black transition-colors">
              chat.dhushyandh.me
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
