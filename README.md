# LegalMitr 2025 🇮🇳

**LegalMitr** is an AI-powered legal assistant tailored for the Indian legal context. It simplifies complex legal documents, identifies risks, and drafts professional legal agreements using Google's Gemini AI.

## 🚀 Features

* **Document Analysis**: Upload PDFs to get summaries, risk scores, and clause explanations.
* **Multilingual Support**: Instant translation of the interface and analysis into 8+ Indian languages (Hindi, Marathi, Tamil, etc.).
* **Legal Document Generator**: Draft contracts and agreements based on simple prompts, with options to redraft specific clauses.
* **Gap Analysis**: Automatically detects missing critical clauses in contracts.
* **Mock Lawyer Consultation**: simulates a consultation request flow with fee estimation.
* **Calendar Integration**: Track legal dates and deadlines.

## 🛠 Tech Stack

* **Frontend**: React (Vite) + TypeScript
* **Styling**: Tailwind CSS + Lucide Icons
* **AI Engine**: Google Gemini API (`@google/genai`)
* **Markdown Rendering**: Marked
* **State Management**: React Context API

## ⚙️ Setup & Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/nikipatil281/LegalMitr.git
    cd legalmitr-2025
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory and add your Google Gemini API Key:
    ```env
    VITE_API_KEY=your_google_api_key_here
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```

## 📦 Deployment

This project is optimized for deployment on **Netlify**.

1.  Push code to GitHub.
2.  Import project to Netlify.
3.  Add `VITE_API_KEY` in Netlify Site Settings > Environment Variables.
4.  Deploy!

The project that we deployed: legalmitr-2025.netlify.app

## ⚠️ Note on Authentication
This version uses **Mock Authentication** for demonstration purposes. Following is the Authentication defaults used:
- **Email**: demo@legalmitr.com
- **Password**: (Any password works)