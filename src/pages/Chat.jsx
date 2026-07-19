import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import axios from "axios";
import {
  MessageSquare,
  Plus,
  Trash2,
  Settings as SettingsIcon,
  Sparkles,
  Send,
  StopCircle,
  RefreshCw,
  Copy,
  Check,
  Search,
  Menu,
  X,
  LogOut,
  User,
  ChevronRight,
  Download,
  AlertCircle,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { useUser, useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { SUGGESTED_PROMPTS } from "../constants/dhushyandhData";

export default function Chat() {
  const navigate = useNavigate();
  const { user, isSignedIn, isLoaded: isUserLoaded } = useUser();
  const { signOut, getToken } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [streamingText, setStreamingText] = useState("");
  const streamIntervalRef = useRef(null);

  const { openUserProfile } = useClerk()

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const hasLoadedRef = useRef(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("Airo_theme") || "light";
  });

  useEffect(() => {
    if (!isUserLoaded || !isSignedIn || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadConversations = async () => {
      try {
        const token = await getToken();
        const res = await axios.get("/api/conversations", {
          headers: { Authorization: `Bearer ${token}` }
        });

        let loaded = res.data;
        if (loaded.length === 0) {
          const createRes = await axios.post("/api/conversations", {
            title: "Introduction"
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const defaultChat = { ...createRes.data, messages: [] };
          loaded = [defaultChat];
        }

        setConversations(loaded);

        const savedActiveId = localStorage.getItem("Airo_active_chat_id");
        const activeExists = loaded.some(c => c.id === savedActiveId);
        const initialActiveId = activeExists ? savedActiveId : loaded[0].id;
        setActiveChatId(initialActiveId);
        localStorage.setItem("Airo_active_chat_id", initialActiveId);
      } catch (err) {
        console.error("Error loading conversations:", err);
        showToast("Failed to load conversations.", "error");
      }
    };

    loadConversations();
  }, [isUserLoaded, isSignedIn]);

  useEffect(() => {
    if (!activeChatId || !isSignedIn) return;

    const loadMessages = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`/api/messages/${activeChatId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setConversations(prev => prev.map(c =>
          c.id === activeChatId ? { ...c, messages: res.data } : c
        ));
      } catch (err) {
        console.error("Error loading messages for active chat:", err);
      }
    };

    loadMessages();
  }, [activeChatId, isSignedIn]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, activeChatId, streamingText]);

  const activeChat = conversations.find(c => c.id === activeChatId);

  const handleNewChat = async () => {
    try {
      const token = await getToken();
      const res = await axios.post("/api/conversations", {
        title: "New Conversation"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newChatObj = {
        id: res.data.id,
        title: res.data.title,
        createdAt: res.data.createdAt,
        messages: []
      };

      setConversations(prev => [newChatObj, ...prev]);
      setActiveChatId(newChatObj.id);
      localStorage.setItem("Airo_active_chat_id", newChatObj.id);
      setInputText("");
      setSidebarOpen(false);
    } catch (err) {
      console.error("Error creating new chat:", err);
      showToast("Failed to create new conversation.", "error");
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      const token = await getToken();
      await axios.delete(`/api/conversations/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filtered = conversations.filter(c => c.id !== chatId);
      setConversations(filtered);

      if (activeChatId === chatId) {
        if (filtered.length > 0) {
          setActiveChatId(filtered[0].id);
          localStorage.setItem("Airo_active_chat_id", filtered[0].id);
        } else {
          setActiveChatId(null);
          localStorage.removeItem("Airo_active_chat_id");
        }
      }
      showToast("Conversation deleted.", "success");
    } catch (err) {
      console.error("Error deleting chat:", err);
      showToast("Failed to delete conversation.", "error");
    }
  };

  // Handle suggested prompt clicks
  const handleSuggestedPrompt = (prompt) => {
    setInputText(prompt);
    sendMessage(prompt);
  };

  // Submit send message handler
  const sendMessage = async (overrideText) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || isLoading) return;

    setInputText("");
    if (!activeChatId) return;

    const userMessageId = `msg_${Date.now()}_usr`;
    const userMessageObj = {
      id: userMessageId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    let activeChatCopy = { ...activeChat };
    activeChatCopy.messages = [...activeChatCopy.messages, userMessageObj];

    if (activeChatCopy.title === "New Conversation") {
      activeChatCopy.title = textToSend.length > 24 ? textToSend.substring(0, 24) + "..." : textToSend;
    }

    const updatedConvs = conversations.map(c => c.id === activeChatId ? activeChatCopy : c);
    setConversations(updatedConvs);
    setIsLoading(true);

    try {
      const token = await getToken();

      // Save user message to database
      await axios.post("/api/messages", {
        conversationId: activeChatId,
        role: "user",
        content: textToSend
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      abortControllerRef.current = new AbortController();

      const response = await axios.post(`/api/chat`, {
        messages: activeChatCopy.messages.map(m => ({ role: m.role, content: m.content }))
      }, {
        signal: abortControllerRef.current.signal
      });

      const fullResponseText = response.data.content;

      // Trigger high-fidelity progressive streaming reveal effect
      simulateStreamingReveal(fullResponseText);
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Airo: Generation aborted by user.");
      } else {
        console.error("Airo Chat Error:", err);
        const errorMsgId = `msg_${Date.now()}_err`;
        const errorMsgObj = {
          id: errorMsgId,
          role: "assistant",
          content: "Sorry, I encountered an operational disruption fetching answers. Please verify your GEMINI_API_KEY parameters in the settings context or retry.",
          timestamp: new Date().toISOString()
        };

        try {
          const token = await getToken();
          await axios.post("/api/messages", {
            conversationId: activeChatId,
            role: "assistant",
            content: errorMsgObj.content
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (dbErr) {
          console.error("Error saving error message to database:", dbErr);
        }

        activeChatCopy.messages = [...activeChatCopy.messages, errorMsgObj];
        const withErr = conversations.map(c => c.id === activeChatId ? activeChatCopy : c);
        setConversations(withErr);
      }
      setIsLoading(false);
    }
  };

  const simulateStreamingReveal = (text) => {
    const words = text.split(" ");
    let currentWordIdx = 0;
    let accumulatedText = "";
    const assistantMessageId = `msg_${Date.now()}_asst`;

    setStreamingMessageId(assistantMessageId);
    setStreamingText("");

    streamIntervalRef.current = setInterval(() => {
      if (currentWordIdx < words.length) {
        accumulatedText += (currentWordIdx === 0 ? "" : " ") + words[currentWordIdx];
        setStreamingText(accumulatedText);
        currentWordIdx++;
      } else {
        // Complete streaming
        finalizeStreaming(assistantMessageId, accumulatedText);
      }
    }, 25); // Sleek fluid speed
  };

  const finalizeStreaming = async (msgId, finalContent) => {
    clearInterval(streamIntervalRef.current);

    const assistantMessageObj = {
      id: msgId,
      role: "assistant",
      content: finalContent,
      timestamp: new Date().toISOString(),
    };

    try {
      const token = await getToken();
      await axios.post("/api/messages", {
        conversationId: activeChatId,
        role: "assistant",
        content: finalContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error saving assistant message to database:", err);
      showToast("Failed to save response to database.", "error");
    }

    setConversations((prev) => {
      const updated = prev.map((chat) => {
        if (chat.id !== activeChatId) return chat;

        return {
          ...chat,
          messages: [...chat.messages, assistantMessageObj],
        };
      });
      return updated;
    });

    setStreamingMessageId(null);
    setStreamingText("");
    setIsLoading(false);
  };

  // Stop Generation Trigger
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    if (streamingMessageId) {
      finalizeStreaming(streamingMessageId, streamingText + " ... [Generation stopped]");
    } else {
      setIsLoading(false);
    }
  };

  // Regenerate Response
  const handleRegenerateResponse = () => {
    if (isLoading || !activeChat || activeChat.messages.length < 2) return;

    // Remove last message if assistant
    let updatedMessages = [...activeChat.messages];
    const lastMsg = updatedMessages[updatedMessages.length - 1];
    if (lastMsg.role === "assistant") {
      updatedMessages.pop();
    }

    const activeChatCopy = { ...activeChat, messages: updatedMessages };
    const clearedLast = conversations.map(c => c.id === activeChatId ? activeChatCopy : c);
    setConversations(clearedLast);

    // Trigger message resend with user last content
    const lastUserQuery = updatedMessages[updatedMessages.length - 1]?.content || "";
    sendMessage(lastUserQuery);
  };

  // Clear entire conversations list
  const handleClearAll = async () => {
    try {
      const token = await getToken();
      await axios.delete("/api/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const res = await axios.post("/api/conversations", {
        title: "Introduction"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const defaultChat = {
        id: res.data.id,
        title: res.data.title,
        createdAt: res.data.createdAt,
        messages: [
          {
            id: "msg_system_welcome",
            role: "assistant",
            content: "Hello! I am Airo, Dhushyandh N's AI Personal Assistant. Ask me about Dhushyandh's skills, experience, projects like **Project Management App , Ai Resume Analyser**, or feel free to download his resume!",
            timestamp: new Date().toISOString()
          }
        ]
      };

      await axios.post("/api/messages", {
        conversationId: defaultChat.id,
        role: "assistant",
        content: defaultChat.messages[0].content
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConversations([defaultChat]);
      setActiveChatId(defaultChat.id);
      localStorage.setItem("Airo_active_chat_id", defaultChat.id);
      showToast("All conversations have been cleared.", "success");
    } catch (err) {
      console.error("Error clearing conversations:", err);
      showToast("Failed to clear conversations.", "error");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Message copied to clipboard!", "success");
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-screen font-sans flex bg-white text-black selection:bg-gray-100">

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 border-r border-black/10 bg-white flex flex-col justify-between transition-transform duration-300 md:relative md:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="flex flex-col grow overflow-y-auto bg-white">
          <div className="p-5 border-b border-black/10 flex items-center justify-between bg-white">
            <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white">
                <span className="font-extrabold text-base leading-none">AI</span>
              </div>
              <span className="font-semibold text-lg tracking-tight text-black">Airo</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-black md:hidden">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-3 bg-white">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-black rounded-xl hover:bg-black hover:text-white transition-all shadow-sm text-xs font-semibold cursor-pointer text-black"
            >
              <span>New Chat</span>
              <Plus size={14} />
            </button>

            <div className="relative bg-white">
              <Search className="absolute left-3 top-2.5 text-black/50" size={12} />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 border border-black rounded-xl bg-white text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all placeholder-black/40"
              />
            </div>
          </div>

          <div className="grow px-2 py-3 overflow-y-auto space-y-1 bg-white">
            <div className="text-[10px] font-bold text-black/50 px-3 uppercase tracking-widest mb-3">History</div>
            {filteredConversations.length > 0 ? (
              filteredConversations.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    localStorage.setItem("Airo_active_chat_id", chat.id);
                    setSidebarOpen(false);
                  }}
                  className={`group p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all border-l-2 ${activeChatId === chat.id
                    ? "bg-black text-white font-semibold border-black"
                    : "hover:bg-black/5 text-black border-transparent"
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare size={13} className="shrink-0" />
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/20 text-black group-hover:text-red-600 transition-opacity"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-black/40 font-light">No records found.</div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-black/10 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <UserButton />

              <div className="truncate">
                <p className="text-sm font-semibold truncate">
                  {user?.fullName}
                </p>
                <p className="text-xs text-black/50 truncate">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-black">
            <Link onClick={openUserProfile} className="py-1.5 px-2 rounded-lg border border-black hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-1.5 text-black">
              <SettingsIcon size={11} />
              <span>Settings</span>
            </Link>
            <button
              onClick={() => setShowClearModal(true)}
              className="py-1.5 px-2 rounded-lg border border-black hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-black"
            >
              <Trash2 size={11} />
              <span>Clear Chats</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-zinc-900/10 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Workspace Frame */}
      <div className="grow flex flex-col min-w-0 bg-white">
        <header className="sticky top-0 z-20 px-6 py-4 border-b border-black/10 bg-white/90 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg border border-black hover:bg-black hover:text-white text-black md:hidden"
            >
              <Menu size={16} />
            </button>
            <div className="flex items-center gap-2.5">
              {
                <span className="text-[10px] font-bold px-2 py-0.5 bg-black text-white rounded">Airo</span>}
              <span className="text-black/20">|</span>
              <div className="relative">
                <button
                  onClick={() => setShowChatDropdown(!showChatDropdown)}
                  className="
      flex items-center gap-2
      px-2 py-2
      rounded-xl
      border border-black/10
      bg-white
      hover:bg-gray-50
      shadow-sm transition-all cursor-pointer min-w-55 justify-between
    "
                >
                  <span className="truncate text-sm font-semibold">
                    {activeChat?.title || "Select Chat"}
                  </span>

                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showChatDropdown ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {showChatDropdown && (
                  <div
                    className="
        absolute
        top-full
        left-0
        mt-2
        w-72
        bg-white
        border
        border-black/10
        rounded-2xl
        shadow-2xl
        overflow-hidden
        z-50
      "
                  >
                    <div className="max-h-72 overflow-y-auto py-2">
                      {conversations.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => {
                            setActiveChatId(chat.id);
                            localStorage.setItem("Airo_active_chat_id", chat.id);
                            setShowChatDropdown(false);
                          }}
                          className={` w-full px-4 py-3 flex items-center justify-between text-left transition-all hover:bg-black hover:text-white cursor-pointer
              ${activeChatId === chat.id
                              ? "bg-black text-white"
                              : "text-black"
                            }
            `}
                        >
                          <div className="flex items-center gap-3">
                            <MessageSquare size={15} />
                            <span className="truncate text-sm">
                              {chat.title}
                            </span>
                          </div>

                          {activeChatId === chat.id && (
                            <Check size={15} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mr-2 text-xs font-semibold text-black/65">
            <UserButton
              afterSignOutUrl="/"
              userProfileMode="modal"
              appearance={{
                elements: {
                  avatarBox: "w-12 h-12 rounded-lg bg-black flex items-center justify-center text-white",
                },
              }}
            />
          </div>
        </header>

        {/* Central viewport messages display */}
        <div className="grow overflow-y-auto px-4 md:px-6 py-6 space-y-6 bg-white">
          <AnimatePresence>
            {activeChat && activeChat.messages.length > 0 ? (
              activeChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {/* Assistant Avatar */}
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0 shadow-sm border border-black">
                      <span className="font-extrabold text-xs">AI</span>
                    </div>
                  )}

                  <div className={`
                    p-4 rounded-2xl max-w-[85%] md:max-w-[75%] border shadow-sm space-y-2
                    ${msg.role === "user"
                      ? "bg-black text-white border-black"
                      : "bg-white border-black text-black"}
                  `}>
                    <div className={`flex items-center justify-between gap-4 text-[9px] border-b pb-1.5 mb-1.5 font-bold uppercase tracking-wider ${msg.role === "user" ? "text-white/70 border-white/20" : "text-black/50 border-black/10"
                      }`}>
                      <span>{msg.role === "assistant" ? "Airo Assistant" : user?.firstName || "Visitor"}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Rendering Markdown with appropriate wrapper styles */}
                    <div className={`markdown-body text-sm leading-relaxed font-normal font-sans space-y-2 prose prose-sm max-w-none prose-headings:font-semibold ${msg.role === "user" ? "text-white prose-invert" : "text-black"
                      }`}>
                      <Markdown>{msg.content}</Markdown>
                    </div>

                    <div className={`flex items-center justify-end gap-2 pt-2 border-t mt-2 ${msg.role === "user" ? "text-white/60 border-white/20" : "text-black/40 border-black/10"
                      }`}>
                      <button
                        onClick={() => handleCopy(msg.content)}
                        className={`p-1 rounded transition-colors ${msg.role === "user" ? "hover:bg-white/20 hover:text-white" : "hover:bg-black/10 hover:text-black"
                          }`}
                        title="Copy message"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>

                  {/* User Avatar */}
                  {msg.role === "user" && (
                    <img
                      src={user?.imageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"}
                      alt="User"
                      className="w-8 h-8 rounded-full object-cover border border-black/10 shrink-0"
                    />
                  )}
                </div>
              ))
            ) : (
              <EmptyChatPanel handleSuggested={handleSuggestedPrompt} />
            )}
            {streamingMessageId && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse border border-black">
                  <span className="font-extrabold text-xs">AI</span>
                </div>
                <div className="p-4 rounded-2xl max-w-[85%] md:max-w-[75%] border border-black bg-white text-black shadow-sm">
                  <div className="flex items-center justify-between gap-4 text-[9px] text-black/50 border-b border-black/10 pb-1.5 mb-1.5 font-bold uppercase tracking-wider">
                    <span>Airo Assistant</span>
                    <span className="text-black animate-pulse font-semibold">Streaming</span>
                  </div>
                  <div className="markdown-body text-sm leading-relaxed font-normal font-sans space-y-2 prose prose-sm max-w-none text-black">
                    <Markdown>{streamingText}</Markdown>
                  </div>
                </div>
              </div>
            )}
            {isLoading && !streamingMessageId && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white shrink-0 shadow-sm animate-bounce border border-black">
                  <span className="font-extrabold text-xs">AI</span>
                </div>
                <div className="px-4 py-3 rounded-2xl border border-black bg-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-black/10 bg-white">
          <div className="max-w-3xl mx-auto space-y-3 bg-white">

            <div className="flex items-center justify-center gap-3 bg-white">
              {isLoading && (
                <button
                  onClick={handleStopGenerating}
                  className="px-3 py-1 text-xs rounded-full border border-red-600 text-red-600 bg-white hover:bg-red-600 hover:text-white flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                >
                  <StopCircle size={12} />
                  <span>Stop Generating</span>
                </button>
              )}
              {!isLoading && activeChat && activeChat.messages.length > 1 && (
                <button
                  onClick={handleRegenerateResponse}
                  className="px-3 py-1 text-xs rounded-full border border-black text-black hover:text-white hover:bg-black flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Regenerate Response</span>
                </button>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
                placeholder="Ask Anything about Dhushyandh... "
                className="w-full pl-5 pr-14 py-4 border border-black rounded-2xl text-sm bg-white text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all placeholder-black/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="absolute right-2.5 p-2 rounded-xl bg-black text-white hover:bg-black/80 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
              >
                <Send size={14} />
              </button>
            </form>
            <div className="text-[10px] text-center text-black/40 font-semibold uppercase tracking-tighter bg-white">
              Responses are based on Dhushyandh's portfolio and available information.
            </div>
          </div>
        </div>
        {showClearModal && (
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowClearModal(false)}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-3xl bg-white border border-black/10 shadow-2xl p-6">

                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="text-red-600" size={26} />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-center">
                  Clear all conversations?
                </h2>

                <p className="text-sm text-zinc-500 text-center mt-3">
                  This action cannot be undone.
                </p>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowClearModal(false)}
                    className="flex-1 py-3 rounded-xl border border-black/10 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleClearAll();
                      setShowClearModal(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                  >
                    Clear Chats
                  </button>
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyChatPanel({ handleSuggested }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grow flex flex-col justify-center items-center py-12 max-w-2xl mx-auto space-y-8 h-full bg-white text-black"
    >
      <div className="text-center space-y-3 bg-white">
        <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center mx-auto shadow-sm border border-black">
          <span className="font-extrabold text-xl leading-none">AI</span>
        </div>
        <h3 className="text-4xl font-extrabold tracking-tight text-black">Meet Airo</h3>
        <p className="text-xs text-black/50 font-normal leading-relaxed max-w-md mx-auto">
          Ask anything about Dhushyandh.
        </p>
      </div>

      <div className="w-full space-y-3 bg-white">
        <div className="text-[10px] font-bold text-black/40 uppercase tracking-widest text-center bg-white">Suggested prompts</div>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3.5 bg-white">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggested(prompt)}
              className="p-4 text-left border border-black rounded-2xl text-xs bg-white hover:bg-black hover:text-white transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-black group-hover:text-white">{prompt}</span>
                <span className="text-[10px] text-black/40 group-hover:text-white/60">Click to run prompt</span>
              </div>
              <ChevronRight size={14} className="text-black/50 group-hover:text-white transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
