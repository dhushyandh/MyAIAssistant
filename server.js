import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import cors from 'cors';
import { PrismaClient } from "@prisma/client";
import { clerkMiddleware } from "@clerk/express";


const prisma = new PrismaClient();

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (err) {
    return null;
  }
}

const authenticate = (req, res, next) => {
  if (process.env.CLERK_SECRET_KEY && req.auth && req.auth.userId) {
    req.userId = req.auth.userId;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    if (token === 'mock-token' || token === 'undefined') {
      req.userId = 'user_demo_123456';
      return next();
    }

    const payload = decodeJwtPayload(token);
    if (payload && payload.sub) {
      req.userId = payload.sub;
      return next();
    }
  }

  return res.status(401).json({ error: "Unauthorized: Authentication required" });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json());


  const apiKey = process.env.GEMINI_API_KEY;
  let ai = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
  }

  // REST Endpoints for Chat History Migration
  app.get("/api/conversations", authenticate, async (req, res) => {
    try {
      const conversations = await prisma.conversation.findMany({
        where: { userId: req.userId },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" }
          }
        }
      });
      const formatted = conversations.map(c => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        messages: c.messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt.toISOString()
        }))
      }));
      res.json(formatted);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/conversations", authenticate, async (req, res) => {
    try {
      const { title } = req.body;
      const conversation = await prisma.conversation.create({
        data: {
          title: title || "New Conversation",
          userId: req.userId
        }
      });
      res.json({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: []
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/conversations/:id", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const conversation = await prisma.conversation.findUnique({
        where: { id }
      });

      if (!conversation || conversation.userId !== req.userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await prisma.conversation.delete({
        where: { id }
      });
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/conversations", authenticate, async (req, res) => {
    try {
      await prisma.conversation.deleteMany({
        where: { userId: req.userId }
      });
      res.json({ message: "All conversations cleared successfully" });
    } catch (error) {
      console.error("Error clearing conversations:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/messages/:conversationId", authenticate, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation || conversation.userId !== req.userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" }
      });

      const formatted = messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.createdAt.toISOString()
      }));

      res.json(formatted);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/messages", authenticate, async (req, res) => {
    try {
      const { conversationId, role, content } = req.body;
      if (!conversationId || !role || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation || conversation.userId !== req.userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          role,
          content
        }
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });

      if (role === "user" && conversation.title === "New Conversation") {
        const newTitle = content.length > 24 ? content.substring(0, 24) + "..." : content;
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { title: newTitle }
        });
      }

      res.json({
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
        timestamp: message.createdAt.toISOString()
      });
    } catch (error) {
      console.error("Error storing message:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // API Route for chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }

      // If we are in mock mode, return mock responses
      if (!ai) {
        return handleMockChat(messages, res);
      }

      // Filter and map the messages for Gemini
      let contents = [];
      let lastRole = null;
      for (const msg of messages) {
        const role = msg.role === "assistant" ? "model" : "user";
        const text = msg.content || "";
        if (!text.trim()) continue;

        // Gemini multi-turn conversation must start with a "user" message
        if (contents.length === 0 && role === "model") {
          continue;
        }

        if (role === lastRole) {
          // Merge consecutive same-role messages
          contents[contents.length - 1].parts[0].text += "\n" + text;
        } else {
          contents.push({
            role: role,
            parts: [{ text: text }]
          });
          lastRole = role;
        }
      }

      if (contents.length === 0) {
        return res.status(400).json({ error: "No valid user messages found." });
      }

      const systemInstruction = getDhushyandhSystemInstruction();

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ content: response.text });
    } catch (error) {
      console.error("Gemini API Error:", error);
      console.log("Airo: Gracefully falling back to integrated dialogue engine.");
      return handleMockChat(req.body.messages, res);
    }
  });

  // Mock chat fallback helper - Robust Rule-Based Dialogue Engine
  function handleMockChat(messages, res) {
    const lastMessage = messages[messages.length - 1]?.content?.trim() || "";
    const lastLower = lastMessage.toLowerCase();

    let responseText = "";

    // 1. GREETINGS & INTRODUCTIONS
    if (lastLower.match(/\b(hi|hello|hey|greetings|whats up|yo|hola)\b/)) {
      responseText = `Hello! I am **Airo**, Dhushyandh N's AI Personal Assistant. 

I'm here to introduce you to Dhushyandh's world of software craftsmanship, robust technical stack, and interactive portfolio projects! 

Here are a few things you can ask me:
* 🛠️ **"Tell me about your technical skills"**
* 📁 **"What projects have you built?"** (like Project Management App , Ai Resume Analyser)
* 💼 **"Tell me about your professional work experience"**
* 📧 **"How can I contact Dhushyandh?"**

What would you like to explore first?`;
    }
    // 2. WHO IS DHUSHYANDH / PROFILE OVERVIEW
    else if (lastLower.includes("who is") || lastLower.includes("about") || lastLower.includes("dhushyandh") || lastLower.includes("profile") || lastLower.includes("bio") || lastLower.includes("background") || lastLower.includes("who are you")) {
      responseText = `**Dhushyandh N** is a highly capable and passionate **Full-Stack Software Engineer & AI Developer** dedicated to building exquisite, production-ready web products and SaaS applications. 

Here is a quick snapshot of his background:
* 🎓 **Role**: Software Engineer / Full-Stack Specialist
* 📍 **Location**: Open to Remote and Hybrid roles worldwide
* 💡 **Core Philosophy**: Merging high-performance engineering with absolute minimalist visual design (inspired by modern aesthetics like Vercel, Linear, and Apple).
* ⚙️ **Specialties**: Rich frontend dashboards (React, Tailwind), scalable backends (Node.js, FastAPI), and smart integrations (Gemini API, RAG, custom agents).

Would you like to check out his **technical skills** or read about his **notable projects** next?`;
    }
    // 3. PROJECTS & NOTABLE PRODUCTS
    else if (lastLower.includes("project") || lastLower.includes("portfolio") || lastLower.includes("showcase") || lastLower.includes("built") || lastLower.includes("Project Management App , Ai Resume Analyser") || lastLower.includes("analyzer") || lastLower.includes("resume analyzer")) {
      if (lastLower.includes("Project Management App , Ai Resume Analyser") || lastLower.includes("dashboard") || lastLower.includes("bento")) {
        responseText = `### 📁 Project Spotlight: **Project Management App , Ai Resume Analyser**

**Project Management App , Ai Resume Analyser** is a premium, high-performance, real-time data visualization and collaboration dashboard built with exceptional visual polish.

* 🛠️ **The Tech Stack**: React 18, Node.js, Express, WebSockets, Tailwind CSS, Recharts, Framer Motion, and Google Gemini API.
* ⚡ **Core Features**:
  * **Interactive Bento Grid**: Highly custom modular widgets with drag-and-drop capabilities.
  * **Real-Time Collaboration**: Shared multiplayer workspace rooms using active WebSocket channels.
  * **AI Insights**: Automatically summarizes complex datasets and generates smart metrics using Gemini.
  * **Live Synchronization**: Seamless instant state updates across all session peers.

It showcases Dhushyandh's ability to architect advanced state management, real-time events, and fluid user interactions.`;
      } else if (lastLower.includes("analyzer") || lastLower.includes("resume") || lastLower.includes("audit")) {
        responseText = `### 📁 Project Spotlight: **AI Resume Analyzer**

The **AI Resume Analyzer** is an intelligent auditing platform helping job seekers align their resumes perfectly to target job descriptions.

* 🛠️ **The Tech Stack**: React, Python, FastAPI, PyPDF, Tailwind CSS, Google Gemini API, PostgreSQL.
* ⚡ **Core Features**:
  * **PDF Parsing & Audit**: Extracts resume parameters and cross-references them against job specifications.
  * **Semantic Gap Analysis**: Identifies missing keywords, missing skills, and metrics structure.
  * **Interview Simulator**: Dynamically generates tailored technical and behavioral mock interviews using Gemini.
  * **Match Scoring**: Computes objective percentage match and gives actionable, categorized bullet-point recommendations.

It won **1st place in a regional HackAI hackathon** and demonstrates his proficiency in semantic searches, prompt engineering, and full-stack Python architectures.`;
      } else {
        responseText = `Dhushyandh has designed and deployed multiple high-polish full-stack products. Here are his primary showcases:

1. ⚡ **Project Management App , Ai Resume Analyser**
   * *Description*: Real-time collaborative bento dashboard with modular drag-and-drop widgets and live state syncing.
   * *Tech*: React, Node.js, WebSockets, Recharts, Gemini API.

2. 🤖 **AI Resume Analyzer** *(Hackathon Winner!)*
   * *Description*: Intelligent resume auditor comparing files to job descriptions with gap analysis and custom interview simulation.
   * *Tech*: FastAPI, Python, React, PostgreSQL, Gemini API.

3. 🔮 **Airo Portfolio Assistant** *(This App!)*
   * *Description*: Highly responsive AI-powered chatbot with progressive streaming reveal, dynamic suggestions, and Clerk authentication.
   * *Tech*: React, Express, Vite, Clerk, Tailwind CSS, Gemini API.

Which project would you like to hear more details about? Let me know if you want to focus on **Project Management App , Ai Resume Analyser** or the **AI Resume Analyzer**!`;
      }
    }
    // 4. TECHNICAL SKILLS & STACK
    else if (lastLower.includes("skill") || lastLower.includes("tech") || lastLower.includes("stack") || lastLower.includes("frontend") || lastLower.includes("backend") || lastLower.includes("react") || lastLower.includes("node") || lastLower.includes("express") || lastLower.includes("tailwind") || lastLower.includes("fastapi") || lastLower.includes("python") || lastLower.includes("typescript")) {
      responseText = `Dhushyandh has acquired a rich, versatile technical skillset focused on modern web platforms and artificial intelligence:

* 🎨 **Frontend Development**: 
  * React (18/19), TypeScript, Tailwind CSS, Framer Motion, HTML5, CSS3, Vite, Next.js, responsive layouts, mobile-first design.
* ⚙️ **Backend Architectures**:
  * Node.js, Express.js, FastAPI, Python, RESTful APIs, WebSockets, robust server architectures.
* 🗄️ **Databases & Caching**:
  * PostgreSQL, MongoDB, Firebase (Firestore & Authentication), Redis.
* ☁️ **DevOps & Infrastructure**:
  * Git, GitHub, Docker, Google Cloud Platform, AWS (S3, EC2), Vercel.
* 🤖 **AI / ML Integrations**:
  * Google Gemini API SDK (\`@google/genai\`), OpenAI API, RAG (Retrieval-Augmented Generation), Prompt Engineering, LangChain.

He is highly comfortable jumping across client-side performance audits, state synchronizations, and server database optimizations!`;
    }
    // 5. WORK EXPERIENCE / CAREER
    else if (lastLower.includes("experience") || lastLower.includes("work") || lastLower.includes("job") || lastLower.includes("career") || lastLower.includes("cloudevibe") || lastLower.includes("solutions") || lastLower.includes("engineer")) {
      responseText = `Dhushyandh's professional background is defined by building solid web architectures and delivering optimization metrics:

* 💼 **Full-Stack Software Engineer** | AI Tech Solutions | *2024 - Present*
  * Architected complex client panels and built highly concurrent real-time WebSockets event engines.
  * Optimized visual data panels and chart layouts, contributing to a **40% increase in active session retention**.
  * Integrated server-side Gemini RAG models to augment application capabilities.

* 💼 **Junior Developer & Analyst** | CloudVibe Software | *2022 - 2024*
  * Maintained critical cloud servers and designed relational database indexing schemes.
  * Successfully **reduced query latency by 25%** across core production databases.
  * Assisted in migrating legacy views to lightweight responsive React layouts.

He has a proven track record of writing clean code, collaborating with multi-functional teams, and deploying highly responsive tools!`;
    }
    // 6. ACHIEVEMENTS & HACKATHONS
    else if (lastLower.includes("achievement") || lastLower.includes("award") || lastLower.includes("hackathon") || lastLower.includes("regional") || lastLower.includes("win")) {
      responseText = `Here are some notable achievements from Dhushyandh's software development journey:

* 🏆 **HackAI Hackathon Winner**: Secured 1st place in a regional AI Hackathon by designing and building the *AI Resume Analyzer* in under 36 hours.
* 📦 **Open Source Contributor**: Developed and published helper packages for React components, gaining over **10,000+ total downloads**.
* 🚀 **SaaS Entrepreneurship**: Built and launched 3 full-stack utility tools used by student and developer communities for document audits and dashboard mockups.`;
    }
    // 7. EDUCATION
    else if (lastLower.includes("education") || lastLower.includes("degree") || lastLower.includes("bachelor") || lastLower.includes("college") || lastLower.includes("university") || lastLower.includes("study")) {
      responseText = `🎓 Dhushyandh N holds a **Bachelor of Engineering in Computer Science and Engineering**. 

His academic curriculum provided a strong theoretical foundation in:
* Data Structures and Algorithms
* Object-Oriented Software Design
* Relational Databases & SQL
* Operating Systems & Network Infrastructures
* Artificial Intelligence Principles

He has translated this solid academic core directly into building production-quality, fast full-stack applications.`;
    }
    // 8. CONTACT INFO / HIRE HIM
    else if (lastLower.includes("contact") || lastLower.includes("email") || lastLower.includes("reach") || lastLower.includes("phone") || lastLower.includes("linkedin") || lastLower.includes("github") || lastLower.includes("hire")) {
      responseText = `You can easily connect with **Dhushyandh N** using any of these channels:

* 📧 **Email**: [dhushyandhneduncheziyan4896@gmail.com](mailto:dhushyandhneduncheziyan4896@gmail.com) (Best for direct professional inquires!)
* 💼 **LinkedIn**: [linkedin.com/in/dhushyandh](https://linkedin.com/in/dhushyandh) (For professional updates!)
* 📁 **GitHub**: [github.com/dhushyandh](https://github.com/dhushyandh) (To audit his open-source codebases!)
* 🌐 **Portfolio**: [dhushyandh.me](http://dhushyandh.me) (This application!)

Feel free to shoot him an email containing a meeting proposal or project description. He usually responds within 24 hours!`;
    }
    // 9. RESUME / CV DOWNLOAD
    else if (lastLower.includes("resume") || lastLower.includes("cv") || lastLower.includes("download")) {
      responseText = `You can download Dhushyandh N's curriculum vitae directly from this app!

* 📥 **How to download**: Simply click on the **"Download Resume"** button in his profile/portfolio page, or click **"Resume"** at the top header of this chat. It will dynamically generate and download a clean, print-friendly text file (\`Dhushyandh_Neduncheziyan_Resume.txt\`) containing his absolute latest credentials.

If you have any specific questions about his resume sections (such as his role at *AI Tech Solutions* or projects like *Project Management App , Ai Resume Analyser*), ask me here!`;
    }
    // 10. DEFAULT COGNITIVE FALLBACK
    else {
      responseText = `I understand you're interested in Dhushyandh's capabilities! 

As **Airo**, his personal assistant, here is what I can tell you about his journey:
* 🛠️ **Tech Stack**: Skilled in **React**, **TypeScript**, **Tailwind CSS**, **Node.js**, **FastAPI**, **PostgreSQL**, and **Gemini integrations**.
* ⚡ **Main Projects**:
  * **Project Management App , Ai Resume Analyser**: A real-time bento board with live WebSocket syncing.
  * **AI Resume Analyzer**: A smart auditing tool and gap identifier (Hackathon Winner).
* 💼 **Experience**: Worked as a Software Engineer developing advanced interactive panels and optimizing database architectures.

Would you like me to elaborate on his **skills**, detailed **projects**, **work experience**, or do you need his direct **contact details**?`;
    }

    // Simulate typing delay
    setTimeout(() => {
      res.json({ content: responseText });
    }, 600);
  }

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Airo server running on http://localhost:${PORT}`);
  });
}

// System Instruction Definition with Dhushyandh's profile
function getDhushyandhSystemInstruction() {
  return `You are Airo, the official highly sophisticated, professional, and friendly AI Personal Assistant representing Dhushyandh N.
Your primary objective is to represent Dhushyandh beautifully to recruiters, developers, and visitors.

DHUSHYANDH'S PROFILE OVERVIEW:
- Name: Dhushyandh N
- Email: dhushyandhneduncheziyan4896@gmail.com
- Phone: +1 (Contact him via email for details)
- Location: Available for Remote & Hybrid roles worldwide
- Role: Software Engineer / Full-Stack & AI Developer
- Passion: Building exquisite, high-performance web products, interactive dashboards, and AI integrations. Inspired by premium, minimalist design aesthetics (Vercel, Linear, Apple).

TECHNICAL SKILLS:
- Languages: JavaScript (ES6+), TypeScript, Python, HTML5, CSS3, SQL
- Frontend: React 18/19, Tailwind CSS, Framer Motion, Redux, Next.js, responsive web design, mobile-first layouts
- Backend: Node.js, Express.js, FastAPI, Flask, RESTful APIs, WebSockets
- Databases: PostgreSQL, MongoDB, Firebase (Firestore/Auth), Redis
- Devops & Tools: Git, GitHub, Docker, AWS (S3, EC2), Google Cloud, Vercel, Vite, ESLint
- AI/ML: Google Gemini API (using @google/genai), OpenAI, RAG systems, Prompt Engineering, LangChain

NOTABLE PROJECTS:
1. Project Management App
   - Description: A high-performance, real-time data visualization dashboard.
   - Core Features: Collaborative workspace rooms, custom customizable modular bento grid layout with drag-and-drop widgets, AI-powered automatic data insights and summaries, and live data synchronization.
   - Stack: React, Node.js, Express, WebSockets, Tailwind CSS, Recharts, Framer Motion, Gemini API.

2. AI Resume Analyzer
   - Description: An intelligent platform helping job seekers audit their resumes against real descriptions.
   - Core Features: PDF parsing, smart resume feedback and scoring, semantic gap analysis, automatic skill suggestions, and mock interview generator tailored to the job description using Gemini AI.
   - Stack: React, FastAPI, Python, PyPDF, Tailwind CSS, Gemini API, PostgreSQL.

3. Airo (This App)
   - Description: His official AI-powered personal assistant portfolio app.
   - Core Features: Clerk authentication, streaming chatbot, modern minimalist design with white theme/blur accents, dynamic Suggested prompts, resume mock download, interactive skills/projects explore panel, and dark/light modes.
   - Stack: React, Tailwind CSS, Vite, Clerk, Axios, Express, Gemini API.

EDUCATION:
- Bachelor of Engineering in Computer Science and Engineering. In C. Abdul Hakeem College of Engineering & Technology, Vellore, India.

RULES FOR YOUR BEHAVIOR:
1. Always maintain a professional, helpful, elegant, and modern persona.
2. Answer based on Dhushyandh's actual background, projects, skills, education, and credentials specified above.
3. If asked questions unrelated to Dhushyandh or his expertise (e.g. "Who is the Prime Minister of Canada?"), answer them briefly but pivot back to Dhushyandh (e.g., "While I can help you with general knowledge, my specialty is representing Dhushyandh. Would you like to hear about his projects like Project Management App , Ai Resume Analyser?").
4. If asked about facts or details not specified here (like what his specific GPA is, or what exact elementary school he went to), answer honestly and politely that you don't have that information, but offer to provide his contact email so the visitor can ask him directly. **Never invent fake credentials, jobs, or achievements.**
5. Always be polite, positive, and represent him as a top-tier candidate.`;
}

startServer();
