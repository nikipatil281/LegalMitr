
# LegalMitr - Architecture & Design

This document provides a detailed overview of the technical architecture, design principles, and technology stack for the LegalMitr application.

## 1. High-Level Architecture

LegalMitr is a **client-side Single-Page Application (SPA)** built with React. For the current prototype phase, it operates entirely in the browser without a dedicated backend server. All data, including user accounts, uploaded documents, and analysis results, is persisted in the browser's local storage.

This serverless approach was chosen for:
- **Rapid Prototyping:** Allows for quick development and iteration of frontend features and AI integration without the overhead of backend infrastructure.
- **Simplicity:** Keeps the technology stack focused and easy to manage for a single developer.
- **Cost-Effectiveness:** Avoids server and database hosting costs.

The major trade-off is that data is not synchronized across different devices or browsers for the same user. A transition to a full-stack architecture with a dedicated backend and database is a key part of the medium-term roadmap.

---

## 2. Frontend Technology Stack

- **Framework:** **React (v19+) with TypeScript**. A component-based architecture is used for building a modular and maintainable UI. TypeScript adds static typing for improved code quality, developer experience, and bug prevention.
- **Routing:** **React Router (`react-router-dom`)** is used for all client-side navigation, enabling a seamless user experience without full page reloads.
- **AI Integration:** **Google Gemini API (`@google/genai`)** is the core of the application's intelligence. Different models are leveraged for specific tasks to optimize for cost, speed, and capability.
- **Styling:** **Tailwind CSS** is used for its utility-first approach, enabling rapid and consistent UI development. Custom CSS is added for specific animations and effects (e.g., animated borders, hover glows, background gradients).
- **Markdown Parsing:** **Marked** is used to render AI-generated Markdown content into HTML for display in the chat and document generator.
- **Icons:** **Lucide React** provides a clean and extensive set of icons.

---

## 3. State Management

Global application state is managed using **React's Context API**. This approach was chosen to avoid the complexity of external state management libraries like Redux for an application of this scale.

- **`AuthContext`:** Manages the current user's authentication state (`currentUser`) and provides `login`, `register`, and `logout` functions. It uses `sessionStorage` to persist the session for the duration of the browser tab.
- **`DocumentContext`:** Manages the collection of all document sessions for the logged-in user. It handles adding, retrieving, updating, and deleting sessions. This context uses `localStorage` for persistence across browser sessions.
- **`ThemeContext`:** Manages the UI theme (light/dark mode) and provides a function to toggle it. The preference is persisted in `localStorage`.
- **`LanguageContext`:** Manages the currently selected language for the UI and provides the translation function `t`. The preference is persisted in `localStorage`.

### Data Flow

The data flow is unidirectional and typical for a React application:
1.  **User Action:** A user interacts with a component (e.g., clicks "Upload").
2.  **Context Update:** The component calls a function from a context (e.g., `addSession` from `DocumentContext`).
3.  **State Change:** The context provider updates its internal state.
4.  **Re-render:** All components consuming that context are re-rendered with the new state, updating the UI.

---

## 4. AI & Generative Model Integration

The application makes strategic use of different Gemini models to balance performance and capability.

- **Document Analysis (`gemini-2.5-flash`):** This model is used for the initial analysis of uploaded documents. It's chosen for its speed and proficiency in handling structured data. The request includes a strict `responseSchema` to ensure the model's output is always a valid JSON object containing the full analysis: summary, key numbers, clause explanations, risk score, missing clause analysis, and FAQs. This reduces the risk of parsing errors and simplifies frontend logic.
- **Document Generation (`gemini-2.5-pro`):** For the AI Document Generator, the powerful `gemini-2.5-pro` model is used. Its strong reasoning and generation capabilities allow it to draft well-structured, professional legal documents based on a user's natural language prompt. Responses are streamed to the user for a real-time experience.
- **Text-Based Chat (`gemini-2.5-pro`):** For the interactive AI chat, `gemini-2.5-pro` is also used. Its superior conversational capabilities provide more nuanced and accurate answers to user questions. The entire document analysis and prior chat history are passed in the context to maintain conversational continuity.
- **Voice Conversation (`gemini-2.5-flash-native-audio-preview-09-2025`):** The real-time voice assistant uses the Live API with this specialized model. It's designed for low-latency, bidirectional audio streaming, which is essential for creating a natural and fluid conversational experience. The API handles both speech-to-text for user input and text-to-speech for the AI's response, with live transcriptions provided.

---

## 5. UI/UX Design Philosophy

The design focuses on being clean, intuitive, and modern.

- **Clarity and Simplicity:** The interface is designed to be uncluttered, guiding the user's focus to the most important actions and information.
- **Responsive Design:** The application is fully responsive and works seamlessly across various screen sizes.
- **Internationalization (i18n):** The UI is built to support multiple languages, making the tool accessible to a global audience.
- **Visual Feedback:** Subtle animations, hover effects (like the card glow), and loading states provide immediate feedback to user interactions, making the application feel more responsive and alive.
- **User Comfort:** The inclusion of a dark mode allows users to choose their preferred viewing experience, reducing eye strain in low-light environments.
- **Modern Layouts:** The dashboard uses a "Bento Grid" layout to present information in a visually engaging and organized manner.

---

## 6. Data Persistence & Security

- **Persistence:** As mentioned, `localStorage` is used for persisting user accounts (mock), document sessions, and user preferences (theme, language). Documents are stored as Base64 encoded strings. `sessionStorage` is used for the user's login token.
- **Security (Prototype Limitations):** The current authentication is a mock system. Passwords are stored in plain text in `localStorage`. **This is not secure and is intended for demonstration purposes only.** In a production environment, this would be replaced by a secure authentication service (e.g., Firebase Auth, Auth0) with hashed passwords and secure session management (e.g., JWTs stored in HTTPOnly cookies).