
# LegalMitr - Project Documentation

## 1. Project Overview

LegalMitr is an intelligent web application designed to demystify complex legal documents. Users can upload a document and receive an instant, AI-powered analysis that includes a plain-language summary, a detailed breakdown of individual clauses, a comprehensive risk assessment, an analysis of missing clauses, and a list of frequently asked questions. The application also features an interactive chat, a real-time voice assistant, and a powerful document generator, making legal information more accessible and actionable for everyone.

The primary goal is to empower individuals and small businesses with the tools to understand legal paperwork without needing immediate, expensive legal counsel. The user interface is modern, dynamic, and responsive, featuring a dark mode, multi-language support, and subtle animations to enhance the user experience.

---

## 2. Core Features

- **Secure User Authentication:** A simple email/password authentication system to manage user sessions and documents.
- **Document Upload:** Supports various document formats (`.pdf`, `.txt`, images) for analysis via a dynamic, animated upload interface.
- **Comprehensive AI-Powered Analysis:**
    - **Concise Summary:** Generates a high-level overview of the document's purpose and key points.
    - **Key Numbers & Dates:** Extracts and lists important figures and dates for quick review.
    - **Clause-by-Clause Breakdown:** Identifies, extracts, and explains individual clauses in simple terms, including definitions for legal jargon.
    - **Document Risk Assessment:** Provides a numerical risk score (0-100) for the entire document and a summary of the factors contributing to the score.
    - **Missing Clause Analysis:** Evaluates the document's completeness, identifying critical missing clauses and suggesting language to mitigate risks.
    - **FAQ Generation:** Creates a list of common questions a user might have about their specific document and provides clear answers.
- **AI Document Generator:**
    - **Draft from Prompts:** Users can describe their needs in natural language, and the AI will draft a well-structured legal document (e.g., NDA, Service Agreement) formatted in Markdown.
- **Interactive AI Chat & Voice Assistant:**
    - **Context-Aware:** The AI has full context of the analyzed document, enabling focused Q&A.
    - **Text & Voice Modes:** Users can type questions or speak directly to the AI for a hands-free, conversational experience.
    - **Live Transcription:** Provides a real-time transcript of the voice conversation.
- **Dynamic Dashboard & Document Management:**
    - **Modern "Bento Grid" Layout:** Displays key usage statistics and documents in a visually engaging way.
    - **Centralized View:** Lists all uploaded documents with their analysis status and risk score.
    - **Pin & Delete:** Users can pin important documents for quick access or delete old ones.
- **Export & Share Options:**
    - **Print to PDF:** Users can generate a clean, printable PDF report of the full analysis.
    - **Copy Summary:** A quick-copy feature for sharing the high-level analysis.
- **Multi-language & Themed UI:**
    - **15 Languages:** The entire interface is translated into 15 languages.
    - **Light/Dark Mode:** A modern interface with theme toggling for user comfort.
    - **Engaging Animations:** Custom animations and hover effects provide satisfying visual feedback.

---

## 3. Architecture & Tech Stack

The application is a client-side Single-Page Application (SPA) built with React and TypeScript, leveraging the Google Gemini API for its intelligent features. State is managed via React Context, and styling is handled by Tailwind CSS.

For a detailed breakdown of the technical architecture, component structure, state management, and design principles, please see the **[Architecture & Design Documentation](./architecture.md)**.