
import React, { useState, useMemo, createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link, useNavigate, useParams } from 'react-router-dom';
import AnalysisPage from './pages/AnalysisPage';
import DashboardPage from './pages/DashboardPage';
import DocGeneratorPage from './pages/DocGeneratorPage';
import ComparePage from './pages/ComparePage';
import AuthPage from './pages/AuthPage';
import QuizPage from './pages/QuizPage';
import SettingsPage from './pages/SettingsPage';
import { FileText, LogOut, LayoutDashboard, Sun, Moon, Globe, ChevronDown, FilePlus2, Folder as FolderIcon, Briefcase, Scale, Gavel, Landmark, Building2, Shield, KeyRound, User as UserIcon, PlusCircle, X, MoreHorizontal, Edit, Trash2, Swords, ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, CalendarPlus, Settings, Bell, Clock, Check, Plus, FolderOpen, CornerUpLeft, FileDiff, CheckCircle, Info, AlertCircle, Repeat } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
// import { auth } from './services/firebase';
// import { 
//   signInWithEmailAndPassword, 
//   createUserWithEmailAndPassword, 
//   signOut, 
//   onAuthStateChanged, 
//   updateProfile as firebaseUpdateProfile, 
//   User as FirebaseUser
// } from 'firebase/auth';

// Helper for API KEY
const getApiKey = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
  // @ts-ignore
  return process.env.API_KEY || '';
};

// --- DATA TYPES ---
export type User = {
  email: string;
  displayName?: string;
}
export type SubscriptionTier = 'free' | 'pro';

export type Folder = {
  id: string;
  userId: string;
  name: string;
  icon: string;
  createdAt: number;
};
export type LegalTerm = {
  term: string;
  definition: string;
};
export type ClauseExplanationItem = {
  title: string;
  explanation: string;
  originalText: string;
  legalTerms: LegalTerm[];
};
export type KeyNumberItem = {
  key: string;
  value: string;
  isDate?: boolean;
  isoDate?: string;
  isRecurring?: boolean;
  recurrenceInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
};
export type KeyPartyItem = {
    name: string;
    role: string;
    type: 'Individual' | 'Organization';
};
export type PartyRiskItem = {
    party: string;
    score: number;
    summary: string;
};
export type MissingClauseItem = {
  title: string;
  severity: 'Critical' | 'High' | 'Medium';
  protection: string;
  risk: string;
  suggestion: string;
};
export type MissingClauseAnalysis = {
  completenessScore: number;
  completenessSummary: string;
  missingClauses: MissingClauseItem[];
};
export type FaqItem = {
  question: string;
  answer: string;
};
export type AnalysisResult = {
  documentSubject?: string;
  summary: string;
  keyParties: KeyPartyItem[];
  clauseExplanations: ClauseExplanationItem[];
  keyNumbers: KeyNumberItem[];
  riskScore: number;
  riskSummary: string;
  partyRisks: PartyRiskItem[];
  missingClauseAnalysis: MissingClauseAnalysis;
  faq: FaqItem[];
};
export type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};
export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  type: 'theory' | 'scenario';
};
export type QuizAttempt = {
  id: string;
  date: number;
  score?: number;
  totalQuestions: number;
  questions: QuizQuestion[];
  userAnswers?: number[];
  status: 'unattempted' | 'completed' | 'generating' | 'error';
};

// --- SUPPORTING DOC TYPES ---
export type SupportingDocAnalysis = {
    summary: string;
    relevanceToPrimary: string;
    keyConnections: string[]; 
    riskImplications: string;
};

export type SupportingDocument = {
    id: string;
    fileName: string;
    fileType: string;
    base64File: string;
    userComment?: string;
    analysis: SupportingDocAnalysis | null;
    status: 'processing' | 'completed' | 'error';
    createdAt: number;
};

export type DocumentSession = {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  base64File: string;
  pageCount?: number; // Kept for metadata
  tokenUsage?: number; // Added token usage
  status: 'processing' | 'completed' | 'error';
  analysisResult: AnalysisResult | null;
  chatHistory: ChatMessage[];
  createdAt: number;
  title: string;
  isPinned: boolean;
  folderId?: string | null;
  quizHistory?: QuizAttempt[];
  quizGenerationStatus?: 'idle' | 'generating' | 'completed' | 'error';
  supportingDocuments?: SupportingDocument[];
};

export type CalendarEvent = {
  id: string;
  userId: string;
  title: string;
  date: number; // timestamp
  description: string;
  documentId?: string;
  documentTitle?: string;
  reminder?: string; // 'none', '15m', '1h', '1d'
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
};

// Doc Gen Types
export type GeneratedDoc = {
    id: string;
    userId: string;
    title: string;
    initialPrompt: string;
    documentContent: string;
    createdAt: number;
    status: 'generating' | 'completed' | 'error';
    lawyerRequest?: {
        domain: string;
        message: string;
        estimatedFee: number;
        status: 'submitted';
    };
};

// Comparison Types
export type ComparisonDifference = {
  category: string;
  type: 'Added' | 'Removed' | 'Modified';
  description: string;
  impact: 'Critical' | 'High' | 'Medium' | 'Low';
  originalClause?: string;
  newClause?: string;
};

export type ComparisonResult = {
  summary: string;
  differences: ComparisonDifference[];
  conclusion: string;
};

export type ComparisonHistoryItem = {
  id: string;
  userId: string;
  docAId: string;
  docAName: string;
  docBId: string;
  docBName: string;
  date: number;
  status: 'processing' | 'completed' | 'error';
  result?: ComparisonResult;
};

export type NotificationType = 'success' | 'error' | 'info';
export type NotificationItem = {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
};

// Constants for Folders
const FOLDER_ICONS = [
  { id: 'folder', icon: FolderIcon },
  { id: 'briefcase', icon: Briefcase },
  { id: 'scale', icon: Scale },
  { id: 'gavel', icon: Gavel },
  { id: 'landmark', icon: Landmark },
  { id: 'building', icon: Building2 },
  { id: 'shield', icon: Shield },
];

const iconMap: any = {
  folder: FolderIcon,
  briefcase: Briefcase,
  scale: Scale,
  gavel: Gavel,
  landmark: Landmark,
  building: Building2,
  shield: Shield,
};

// --- I18N / TRANSLATIONS ---
const translations = {
  en: {
    status: { completed: 'Completed', processing: 'Processing', error: 'Error', analyzing: 'Analyzing document...', analysisFailed: 'Analysis failed.', analyzedOn: 'Analyzed on: {date}', risk: 'Risk: {score}/100', processingDoc: 'Processing your document...', errorDoc: 'An error occurred during analysis.' },
    auth: { title: 'LegalMitr', signInSubtitle: 'Sign in to access your dashboard', signUpSubtitle: 'Create an account to get started', emailPlaceholder: 'Email Address', passwordPlaceholder: 'Password', confirmPasswordPlaceholder: 'Confirm Password', loginButton: 'Login', createAccountButton: 'Create Account', dontHaveAccount: "Don't have an account?", alreadyHaveAccount: 'Already have an account?', signUp: 'Sign Up', signIn: 'Sign In', passwordRequirements: { length: '6+ characters', uppercase: '1 uppercase', lowercase: '1 lowercase', number: '1 number' } },
    layout: { appName: 'LegalMitr', dashboard: 'Dashboard', docGenerator: 'Legal Document Generator', compareDocs: 'Compare Legal Documents', quiz: 'Explore & Learn', settings: 'Settings', logout: 'Logout', caseFolders: 'Case Folders', createFolder: 'Create Folder', folderName: 'Folder Name', selectIcon: 'Select Icon', editFolder: 'Edit Folder', saveChanges: 'Save Changes', deleteFolder: 'Delete Folder', edit: 'Edit', delete: 'Delete', deleteFolderConfirmTitle: "Delete '{folderName}'?", deleteFolderConfirmDesc: "This action cannot be undone. What would you like to do with the documents inside this folder?", deleteFolderOptionMove: "Move documents to Dashboard", deleteFolderOptionDelete: "Delete documents permanently", deleteFolderOptionDeleteDesc: "All documents, their analyses, and quiz histories will be lost forever.", deleteFolderButton: "Delete Folder Permanently", openFullCalendar: 'Open Full Calendar', today: 'Today', calendar: 'Calendar', upcomingEvents: 'Upcoming Events', noUpcomingEvents: 'No upcoming events' },
    dashboard: { welcome: 'Hey {userName}!', subtitle: 'Upload a document to get started or review your recent analyses.', folderSubtitle: 'Managing documents for the "{folderName}" case.', uploadTitle: 'Upload New Legal Document', uploadSubtitle: 'Click here to select a PDF, TXT, or image file.', uploading: 'Processing...', uploadingSubtitle: 'Your document is being analyzed.', statTotal: 'Total Documents', statTotalDesc: 'Analyzed documents', statCompleted: 'Completed', statCompletedDesc: 'Successfully analyzed', statPinned: 'Pinned', statPinnedDesc: 'Quick access documents', recentDocuments: 'Documents', noDocuments: 'No documents analyzed yet', noDocumentsDesc: 'Click "Upload New Legal Document" to get started.', documentMenu: { pin: 'Pin', unpin: 'Unpin', delete: 'Delete', moveToDashboard: 'Move to Dashboard' }, deleteConfirmTitle: 'Delete this document?', deleteConfirmDesc: 'This will permanently delete "{fileName}", its analysis, and all associated quiz history. This action cannot be undone.', cancel: 'Cancel', dragHint: 'Drag and drop documents into folders on the sidebar to organize them.', folderEmpty: 'This folder is empty', folderEmptyDesc: 'Drag documents from your dashboard here to organize them.' },
    analysis: { title: 'AI Chat', tabAnalysis: 'Analysis', tabClauses: 'Clauses & Gaps', tabRisk: 'Risk Assessment', tabFaq: 'FAQs', tabChat: 'AI Chat', tabSupporting: 'Supporting Docs', processingTitle: 'Analyzing Your Document', processingSubtitle: "This may take a minute. Feel free to navigate away, we'll continue in the background.", step: 'Step {current} of {total}', complete: '{percent}% Complete', timeRemaining: '~{time}s remaining', finalizing: 'Finalizing...', steps: { extract: 'Extracting Key Data', extractDesc: 'Generating summary and identifying key numbers', clauses: 'Analyzing Legal Clauses', clausesDesc: 'Breaking down complex legal language', risk: 'Performing Risk Assessment', riskDesc: 'Calculating risk score and identifying potential issues', missing: 'Checking for Missing Clauses', missingDesc: 'Identifying gaps and suggesting improvements', finalize: 'Finalizing Report', finalizeDesc: 'Compiling the analysis and preparing the chat' }, errorTitle: 'Analysis Failed', errorDesc: "We're sorry, but an error occurred while analyzing your document.", errorSuggestion: 'Please try uploading the document again.', summary: 'Summary', keyNumbers: 'Key Numbers & Dates', keyParties: 'Key Parties', noKeyNumbersTitle: 'No Key Numbers Found', noKeyNumbersDesc: 'The AI could not extract specific dates or numbers from this document.', clauseExplanations: 'Clause Explanations', whatThisMeans: 'What this means for you:', originalText: 'Original legal text:', legalTerms: 'Legal terms explained:', askAboutClause: 'Ask AI about this clause', riskAssessment: 'Risk Assessment', overallRisk: 'Overall Document Risk', partyRisk: 'Party-Specific Risk', riskScore: 'Risk Score', riskSummary: 'Risk Summary', riskLevels: { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }, missingAnalysis: 'Missing Clause Analysis', completeness: 'Document Completeness', missingClauses: 'Missing Clauses ({count})', whatItProtects: 'What this clause would protect:', riskWithout: 'Risk without this clause:', suggestion: 'Suggested language:', askAboutMissing: 'Ask AI about this', exportTitle: 'Analysis Complete', exportDesc: 'Your document has been analyzed for key numbers, risk factors, missing clauses, and legal details.', exportAndShare: 'Export & Share', downloadPdf: 'Download Analysis PDF', copySummary: 'Copy Summary', copied: 'Copied!', copyFailed: 'Failed to copy', analyzeNew: 'Analyze New Document', faq: 'Frequently Asked Questions', chatPlaceholder: 'Ask a question about the document...', chatEmpty: 'Type a message or use the mic to ask about the uploaded document in any <strong>Indian Language</strong> (Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam).', connecting: 'Connecting...', connectionError: 'Connection Error', notCompleteTitle: 'Analysis Not Complete', notCompleteDesc: 'The report can be exported once the analysis is finished.', noClausesTitle: 'No Clause Explanations Found', noClausesDesc: 'Please wait for the analysis to complete, or check the summary tab for errors.', noMissingTitle: 'No Missing Clause Analysis Found', noMissingDesc: 'Please wait for the analysis to complete or check for errors.', supportingUploadTitle: 'Add Supporting Documents', supportingUploadDesc: 'Upload images, transcripts, or amendments. The AI will analyze them in the context of the primary document.', addComment: 'Add a comment (optional)', uploadBtn: 'Upload & Analyze', connections: 'Connections to Primary Document', riskImplications: 'Risk Implications', noSupportingDocs: 'No supporting documents yet.' },
    docGenerator: { title: 'Legal Document Generator', subtitle: 'Draft a professional legal document based on your needs.', aiPrompt: 'Hello! I can help you draft a legal document. Please provide the context, key parties, important dates, the desired language, and any specific clauses or requirements. The more detail you provide, the better the draft will be.', inputPlaceholder: 'e.g., A Non-Disclosure Agreement between Innovate Corp. and a contractor, effective from August 1, 2024, for a duration of 3 years...', generateButton: 'Generate Document', generating: 'Generating your document...', downloadButton: 'Download as TXT', downloadedAs: 'Downloaded as {fileName}', startOverButton: 'Start New Document', disclaimer: 'Disclaimer: This document was generated by an AI. It is for informational purposes only and does not constitute legal advice. Please consult with a qualified legal professional before using this document.', redraftPlaceholder: 'Redraft the document (e.g., "Change the governing law to California")...', newDocument: 'New Document', history: 'History', deleteConfirmTitle: 'Delete this document?', deleteConfirmDesc: 'Are you sure you want to permanently delete this generated document?', lawyer: { reviewTitle: 'Review Consultation Request', connectTitle: 'Connect with a Legal Expert', reviewDesc: 'This is a record of the consultation request you submitted. All fields are read-only.', connectDesc: 'To connect you with the right professional, please select the legal domain that best fits your document. Our AI has provided a suggestion to help you decide.', aiSuggesting: 'AI is suggesting a domain...', criminal: 'Criminal', civil: 'Civil', aiSuggestionBadge: 'AI Suggestion', describeNeeds: 'Describe your legal needs (e.g., "I need this contract reviewed...")', describePlaceholder: 'Please provide as much detail as possible...', lockWarning: 'After clicking "Get Fee Estimate," your selected domain and message will be locked.', getEstimate: 'Get Fee Estimate', estimating: 'AI is estimating the consultation fee...', estimatedFee: 'AI Estimated Fee:', estimateDisclaimer: 'Disclaimer: This is an AI-generated estimate based on your request.', confirmBudget: 'I confirm that this estimated amount is within my budget.', close: 'Close', sendRequest: 'Send Request', reviewButton: 'Review Request', consultButton: 'Consult a Lawyer' }, error: 'Sorry, an error occurred. Please try again.', redraftError: 'Sorry, an error occurred while redrafting.', untitled: 'Untitled Document' },
    quiz: { title: "Test Your Knowledge", subtitle: "Select a document or a legal domain to reinforce your understanding.", selectPrompt: "Select a source to begin.", startButton: "Start Quiz", generatingTitle: "Generating Your Quiz...", generatingSubtitle: "The AI is crafting questions. This may take a moment. You can navigate away and we'll save it in your history.", errorTitle: "Quiz Generation Failed", errorSubtitle: "We couldn't generate a quiz. Please try again.", quizFor: "Quiz for: {fileName}", progress: "Question {current} of {total}", nextButton: "Next Question", finishButton: "Finish Quiz", resultsTitle: "Quiz Results", resultsScore: "You scored {score} out of {total}", yourAnswer: "Your Answer:", correctAnswer: "Correct Answer:", explanation: "Explanation:", takeAnother: "Take Another Quiz", historyTitle: "Quiz History", noHistory: "You haven't taken any quizzes yet. Complete one to see it here!", deleteQuizConfirmTitle: "Delete Quiz?", deleteQuizConfirmDesc: "This quiz attempt will be permanently removed.", deleteButton: "Delete", score: "Score", takenOn: "Taken on", generateNew: "Generate New Quiz", unattempted: "Unattempted", retake: "Retake Quiz" },
    calendar: { title: 'Add to Calendar', editTitle: 'Edit Event', eventName: 'Event Name', eventDesc: 'Description', eventDate: 'Date & Time', reminder: 'Reminder', recurrence: 'Repeats', recurrenceOptions: { none: 'Does not repeat', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }, reminderOptions: { none: 'None', m15: '15 minutes before', h1: '1 hour before', d1: '1 day before' }, save: 'Add to Calendar', update: 'Update Event', delete: 'Delete', fullCalendarTitle: 'Events Calendar', noEvents: 'No events on this day.', fromDocument: 'From document:', inFolder: 'in folder:', placeholderNotes: 'Add any notes or details...', sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', emptyTitleError: 'Please enter an event title' }
  },
};
const translationsObj = translations as any;

// ... [Language Context & Selector] ...
type Language = string;

// Native Names for Languages
const availableLanguages: { code: Language; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi (हिंदी)' },
    { code: 'bn', name: 'Bengali (বাংলা)' },
    { code: 'mr', name: 'Marathi (मराठी)' },
    { code: 'te', name: 'Telugu (తెలుగు)' },
    { code: 'ta', name: 'Tamil (தமிழ்)' },
    { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
    { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ml', name: 'Malayalam (മലയാളം)' },
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}
const LanguageContext = createContext<LanguageContextType | null>(null);

const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  // Initialize with English loaded
  const [translationsMap, setTranslationsMap] = useState<any>({ en: translations.en });
  const [isTranslating, setIsTranslating] = useState(false);

  const translateDictionary = async (targetLang: string, targetLangName: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        
        // We only translate the English values
        const prompt = `You are a translator. Translate the values of the following JSON object into ${targetLangName}. 
        IMPORTANT:
        1. Keep the KEYS exactly the same. Do not translate keys.
        2. Only translate the VALUES.
        3. Return ONLY valid JSON.
        
        JSON to translate:
        ${JSON.stringify(translations.en)}
        `;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = result.text; 
        
        if (!text) throw new Error("No translation returned from AI");
        
        const parsed = JSON.parse(text);
        return parsed;
    } catch (e) {
        console.error("Translation failed:", e);
        return translations.en; // Fallback to English on error
    }
  };

  const handleSetLanguage = async (lang: Language) => { 
    if (lang === 'en') {
        setLanguageState('en');
        return;
    }

    if (translationsMap[lang]) {
        setLanguageState(lang);
        return;
    }

    setIsTranslating(true);
    const langName = availableLanguages.find(l => l.code === lang)?.name || lang;
    
    try {
        const newTranslations = await translateDictionary(lang, langName);
        setTranslationsMap((prev: any) => ({ ...prev, [lang]: newTranslations }));
        setLanguageState(lang);
    } catch (error) {
        console.error("Failed to switch language", error);
    } finally {
        setIsTranslating(false);
    }
  };

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.');
    
    // 1. Try to find the text in the CURRENT language
    let result: any = translationsMap[language] || translationsMap['en'];
    
    // Traverse the object
    for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
            result = result[k];
        } else {
            // 2. If missing, reset and fallback to ENGLISH
             let fallbackResult: any = translations.en;
             let foundFallback = true;
            for (const fk of keys) {
                 if (fallbackResult && typeof fallbackResult === 'object' && fk in fallbackResult) {
                    fallbackResult = fallbackResult[fk];
                } else {
                    foundFallback = false;
                    break;
                }
            }
            if (foundFallback) {
                result = fallbackResult;
            } else {
                result = key; // If even English is missing, show key
            }
            break;
        }
    }
    
    let value = typeof result === 'string' ? result : key;
    
    if (replacements) {
        Object.entries(replacements).forEach(([rKey, rValue]) => {
            value = value.replace(`{${rKey}}`, String(rValue));
        });
    }
    return value;
  }, [language, translationsMap]);

  const value = useMemo(() => ({ 
    language, 
    setLanguage: handleSetLanguage, 
    t, 
    isTranslating 
  }), [language, translationsMap, t, isTranslating]);
  
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
    return context;
};
export const LanguageSelector: React.FC<{ className?: string; }> = ({ className }) => {
  // 1. Get isTranslating status from our provider
  const { language, setLanguage, isTranslating } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
     <div className={`relative ${className}`} ref={dropdownRef}>
      <button 
        // 2. Disable clicking if translating
        onClick={() => !isTranslating && setIsOpen(!isOpen)} 
        disabled={isTranslating}
        className={`flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all ${isTranslating ? 'opacity-75 cursor-wait' : ''}`}
      >
        {isTranslating ? (
            // 3. Show Spinner if translating
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        ) : (
            <Globe className="h-4 w-4" />
        )}
        
        {/* 4. Show "Translating..." text */}
        <span className="text-sm font-medium hidden sm:inline truncate max-w-[100px]">
            {isTranslating ? 'Translating...' : (availableLanguages.find(l => l.code === language)?.name || 'English')}
        </span>
        
        {!isTranslating && <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {/* 5. Hide dropdown if translating */}
      {isOpen && !isTranslating && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto animate-fade-in-up">
          {availableLanguages.map(lang => (
             <button key={lang.code} onClick={() => { setLanguage(lang.code as Language); setIsOpen(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 ${language === lang.code ? 'text-primary font-semibold bg-blue-50 dark:bg-blue-900/20' : 'text-slate-700 dark:text-slate-300'}`}>
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- THEME CONTEXT ---
type Theme = 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large';
interface ThemeContextType { theme: Theme; toggleTheme: () => void; fontSize: FontSize; setFontSize: (size: FontSize) => void; }
const ThemeContext = createContext<ThemeContextType | null>(null);
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return (storedTheme as Theme) || (prefersDark ? 'dark' : 'light');
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('fontSize') as FontSize) || 'small');
  useEffect(() => { if (currentUser && !localStorage.getItem('theme')) setTheme('dark'); }, [currentUser]);
  useEffect(() => localStorage.setItem('theme', theme), [theme]);
  useEffect(() => localStorage.setItem('fontSize', fontSize), [fontSize]);
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const value = useMemo(() => ({ theme, toggleTheme, fontSize, setFontSize }), [theme, fontSize]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
const ThemeApplicator: React.FC = () => {
    const { theme, fontSize } = useTheme();
    const location = useLocation();
    const isAuthPage = location.pathname === '/login';
    useEffect(() => {
        const effectiveTheme = isAuthPage ? 'dark' : theme;
        if (effectiveTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        document.documentElement.classList.remove('font-sm', 'font-md', 'font-lg');
        if (fontSize === 'small') document.documentElement.classList.add('font-sm');
        else if (fontSize === 'large') document.documentElement.classList.add('font-lg');
        else document.documentElement.classList.add('font-md');
    }, [theme, isAuthPage, fontSize]);
    return null;
};
const HeaderThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button onClick={toggleTheme} className="p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all">
            {theme === 'dark' ? <Moon className="h-5 w-5 text-blue-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
        </button>
    );
};

// --- AUTH CONTEXT ---
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  tier: SubscriptionTier;
  setTier: (tier: SubscriptionTier) => void;
}
const AuthContext = createContext<AuthContextType | null>(null);
// --- MOCK AUTH PROVIDER (No Firebase Needed) ---
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with a dummy user logged in by default for local testing
  const [currentUser, setCurrentUser] = useState<User | null>({ 
      email: 'demo@legalmitr.com', 
      displayName: 'Demo User' 
  });
  const [loading, setLoading] = useState(false); // No loading time needed
  const [tier, setTierState] = useState<SubscriptionTier>('free');

  // Load tier from local storage if available
  useEffect(() => {
      if (currentUser) {
        const storedTier = localStorage.getItem(`user_tier_${currentUser.email}`) as SubscriptionTier;
        setTierState(storedTier || 'free');
      }
  }, [currentUser]);

  const setTier = (newTier: SubscriptionTier) => {
      setTierState(newTier);
      if (currentUser) {
          localStorage.setItem(`user_tier_${currentUser.email}`, newTier);
      }
  };

  // Mock Login - accepts any email/password
  const login = async (email: string, pass: string): Promise<void> => {
    setCurrentUser({ email, displayName: 'Demo User' });
  };
  
  // Mock Register - accepts any email/password
  const register = async (email: string, pass: string): Promise<void> => {
    setCurrentUser({ email, displayName: 'New User' });
  };

  // Mock Logout
  const logout = async (): Promise<void> => {
      setCurrentUser(null);
  };

  // Mock Update Profile
  const updateProfile = async (displayName: string) => {
      setCurrentUser(prev => prev ? { ...prev, displayName } : null);
  };
  
  const value = useMemo(() => ({ currentUser, loading, login, register, logout, updateProfile, tier, setTier }), [currentUser, loading, tier]);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- NOTIFICATION CONTEXT ---
interface NotificationContextType {
    addNotification: (type: NotificationType, title: string, message: string) => void;
    removeNotification: (id: string) => void;
}
const NotificationContext = createContext<NotificationContextType | null>(null);

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    const addNotification = useCallback((type: NotificationType, title: string, message: string) => {
        const id = Date.now().toString() + Math.random().toString(36).substring(2);
        setNotifications(prev => [...prev, { id, type, title, message }]);
        
        // Auto dismiss after 6 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 6000);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ addNotification, removeNotification }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {notifications.map(notification => (
                    <NotificationToast key={notification.id} notification={notification} onDismiss={removeNotification} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

const NotificationToast: React.FC<{ notification: NotificationItem, onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
    const { type, title, message } = notification;
    
    let Icon = Info;
    let colorClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700";
    let iconClass = "text-blue-500";

    if (type === 'success') {
        Icon = CheckCircle;
        colorClass = "bg-white dark:bg-slate-800 border-green-200 dark:border-green-900";
        iconClass = "text-green-500";
    } else if (type === 'error') {
        Icon = AlertCircle;
        colorClass = "bg-white dark:bg-slate-800 border-red-200 dark:border-red-900";
        iconClass = "text-red-500";
    }

    return (
        <div className={`${colorClass} border shadow-lg rounded-xl p-4 flex gap-3 items-start w-80 sm:w-96 animate-fade-in-up pointer-events-auto`}>
            <div className={`${iconClass} flex-shrink-0 mt-0.5`}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-grow">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{message}</p>
            </div>
            <button onClick={() => onDismiss(notification.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};

// --- DOCUMENT CONTEXT ---

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    documentSubject: { type: Type.STRING, description: "A single, informative sentence describing the specific core subject and purpose of the document (e.g. 'A Non-Disclosure Agreement between Company A and Company B regarding Project X')." },
    summary: { type: Type.STRING, description: "A detailed summary covering the main points, parties involved, and key obligations." },
    keyParties: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['Individual', 'Organization'] }
        },
        required: ['name', 'role', 'type']
      }
    },
    clauseExplanations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          explanation: { type: Type.STRING },
          originalText: { type: Type.STRING },
          legalTerms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING }
              }
            }
          }
        }
      }
    },
    keyNumbers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          value: { type: Type.STRING },
          isDate: { type: Type.BOOLEAN, description: "Set to true ONLY if the value is a specific date or time (e.g. '2023-01-01', 'January 1st'). Set to false for amounts, percentages, or durations." },
          isoDate: { type: Type.STRING, description: "ISO 8601 date string. If isDate is true, use that date. If isRecurring is true, calculate the NEXT occurrence based on the current date." },
          isRecurring: { type: Type.BOOLEAN, description: "Set to true ONLY if this item represents a repeating EVENT or DEADLINE (e.g. 'Rent Due Date'). Do NOT set to true for monetary amounts (e.g. 'Rent Amount', 'Penalty Fee') even if they are paid monthly." },
          recurrenceInterval: { type: Type.STRING, enum: ['daily', 'weekly', 'monthly', 'yearly'], description: "If isRecurring is true, the interval" }
        }
      }
    },
    riskScore: { type: Type.NUMBER },
    riskSummary: { type: Type.STRING },
    partyRisks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          party: { type: Type.STRING },
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING }
        },
        required: ['party', 'score', 'summary']
      }
    },
    missingClauseAnalysis: {
      type: Type.OBJECT,
      properties: {
        completenessScore: { type: Type.NUMBER },
        completenessSummary: { type: Type.STRING },
        missingClauses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              severity: { type: Type.STRING, enum: ["Critical", "High", "Medium"] },
              protection: { type: Type.STRING },
              risk: { type: Type.STRING },
              suggestion: { type: Type.STRING }
            }
          }
        }
      }
    },
    faq: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          answer: { type: Type.STRING }
        }
      }
    }
  },
  required: ["documentSubject", "summary", "keyParties", "clauseExplanations", "keyNumbers", "riskScore", "riskSummary", "partyRisks", "missingClauseAnalysis", "faq"]
};

const supportingDocSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "A concise summary of this supporting document." },
        relevanceToPrimary: { type: Type.STRING, description: "Explanation of how this document relates to the primary document (e.g., amends clause X, proves compliance, etc.)." },
        keyConnections: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of specific connections, contradictions, or supporting points."
        },
        riskImplications: { type: Type.STRING, description: "How this document affects the risk profile of the primary document." }
    },
    required: ["summary", "relevanceToPrimary", "keyConnections", "riskImplications"]
};

const quizSchema = {
    type: Type.OBJECT,
    properties: {
        quiz: {
            type: Type.ARRAY,
            description: "An array of quiz questions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: "The quiz question." },
                    options: { type: Type.ARRAY, description: "An array of 4 possible answers.", items: { type: Type.STRING } },
                    correctAnswerIndex: { type: Type.NUMBER, description: "The 0-based index of the correct answer in the 'options' array." },
                    explanation: { type: Type.STRING, description: "A detailed explanation of why the correct answer is right, and potentially why others are wrong." },
                    type: { type: Type.STRING, enum: ['theory', 'scenario'], description: "The type of question." }
                },
                required: ['question', 'options', 'correctAnswerIndex', 'explanation', 'type']
            }
        }
    },
    required: ['quiz']
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

interface DocumentContextType {
  sessions: DocumentSession[];
  folders: Folder[];
  addSession: (file: File, folderId?: string | null) => Promise<string>;
  addSupportingDocument: (sessionId: string, file: File, userComment?: string) => Promise<void>;
  getSession: (id: string | undefined) => DocumentSession | undefined;
  updateSession: (id: string, updates: Partial<DocumentSession>) => void;
  deleteSession: (id: string) => void;
  togglePin: (id: string) => void;
  addFolder: (name: string, icon: string) => void;
  updateFolder: (id: string, updates: { name: string; icon: string }) => void;
  deleteFolder: (id: string, options: { deleteDocuments: boolean }) => void;
  getFolder: (id: string | undefined) => Folder | undefined;
  saveQuizResult: (documentId: string, quizId: string, score: number, userAnswers: number[]) => void;
  deleteQuizAttempt: (documentId: string, attemptId: string) => void;
  startQuizGeneration: (sessionId: string) => Promise<string | void>;
  
  // New Domain Quiz Support
  domainQuizzes: Record<string, QuizAttempt[]>;
  startDomainQuizGeneration: (domain: string, options?: { subTopics?: string[], type?: 'theory' | 'scenario' | 'mixed' }) => Promise<string | void>;
  saveDomainQuizResult: (domain: string, quizId: string, score: number, userAnswers: number[]) => void;
  deleteDomainQuizAttempt: (domain: string, attemptId: string) => void;
  
  // Clear User Data
  clearUserData: () => void;
}
const DocumentContext = createContext<DocumentContextType | null>(null);
const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addNotification } = useNotification();
  const { language } = useLanguage(); // Get current language

  const [allSessions, setAllSessions] = useState<DocumentSession[]>(() => {
    try { return localStorage.getItem('documentSessions') ? JSON.parse(localStorage.getItem('documentSessions')!) : []; } 
    catch { return []; }
  });
  const [allFolders, setAllFolders] = useState<Folder[]>(() => {
    try { return localStorage.getItem('documentFolders') ? JSON.parse(localStorage.getItem('documentFolders')!) : []; } 
    catch { return []; }
  });
  const [domainQuizzes, setDomainQuizzes] = useState<Record<string, QuizAttempt[]>>(() => {
    try { return localStorage.getItem('domainQuizzes') ? JSON.parse(localStorage.getItem('domainQuizzes')!) : {}; }
    catch { return {}; }
  });

  useEffect(() => {
      try {
        localStorage.setItem('documentSessions', JSON.stringify(allSessions));
      } catch (e) {
          console.error("Storage error:", e);
      }
  }, [allSessions]);
  useEffect(() => localStorage.setItem('documentFolders', JSON.stringify(allFolders)), [allFolders]);
  useEffect(() => localStorage.setItem('domainQuizzes', JSON.stringify(domainQuizzes)), [domainQuizzes]);

  const updateSession = useCallback((id: string, updates: Partial<DocumentSession>) => {
    setAllSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const startAnalysis = async (sessionToAnalyze: DocumentSession) => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const base64Data = sessionToAnalyze.base64File.split(',')[1]; 
        const mimeType = sessionToAnalyze.fileType || 'application/pdf';

        const langName = availableLanguages.find(l => l.code === language)?.name || 'English';

        const prompt = `Analyze this legal document. Provide the output in ${langName} language.
        1. A single, informative sentence describing the core subject and purpose of the document in ${langName}.
        2. A detailed summary covering the main points, parties involved, and key obligations in ${langName}.
        3. Key parties involved (Name, Role, Type) and Key numbers/dates (extract as key-value pairs). 
           CRITICAL for Key Numbers/Dates: 
           - Identify recurring *events/deadlines* (e.g. "Rent Due Date") and mark them as recurring. 
           - Do NOT mark monetary amounts (e.g. "$1000", "5% interest") as recurring events or dates, even if they are paid monthly. Only dates/deadlines go on a calendar.
        4. Detailed explanations of complex clauses (with original text and simplified legal terms). The explanation must be in ${langName}, original text in English (or source language).
        5. A risk assessment (overall score 0-100 and summary in ${langName}). ALSO provide a specific risk assessment for EACH identified party (Party Name, Score 0-100, Summary of risks specific to them in ${langName}).
        6. Analysis of missing clauses (completeness score, summary in ${langName}, and list of missing critical clauses with severity, protection, risk, and suggestion in ${langName}).
        7. Frequently Asked Questions (FAQ) in ${langName}.
        `;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: base64Data } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema
            }
        });

        const responseText = result.text;
        if (!responseText) throw new Error("Empty response from AI");

        const analysisData = JSON.parse(responseText);
        
        updateSession(sessionToAnalyze.id, {
            status: 'completed',
            analysisResult: analysisData
        });

        // Safe folder access
        let folderName = 'Dashboard';
        try {
            const storedFolders = localStorage.getItem('documentFolders') ? JSON.parse(localStorage.getItem('documentFolders')!) : [];
            const folder = storedFolders.find((f: Folder) => f.id === sessionToAnalyze.folderId);
            if (folder) folderName = folder.name;
        } catch {}
        
        addNotification('success', 'Analysis Complete', `Document "${sessionToAnalyze.fileName}" has been successfully analyzed in ${folderName}.`);

    } catch (error) {
        console.error("Analysis failed", error);
         updateSession(sessionToAnalyze.id, {
            status: 'error',
        });
        addNotification('error', 'Analysis Failed', `Could not analyze "${sessionToAnalyze.fileName}". Please try again.`);
    }
  };
  
  const analyzeSupportingDocument = async (sessionId: string, supportingDoc: SupportingDocument, fileData: string) => {
      const session = allSessions.find(s => s.id === sessionId);
      if (!session || !session.analysisResult) return;
      
      try {
           const ai = new GoogleGenAI({ apiKey: getApiKey() });
           const base64Data = fileData.split(',')[1];
           const mimeType = supportingDoc.fileType || 'application/pdf';
           
           const primarySummary = session.analysisResult.summary;
           const primaryParties = session.analysisResult.keyParties.map(p => `${p.name} (${p.role})`).join(', ');

           const langName = availableLanguages.find(l => l.code === language)?.name || 'English';

           const prompt = `You are analyzing a supporting document (Document B) in the context of a primary document (Document A).
            Primary Document Summary: ${primarySummary}
            Primary Parties: ${primaryParties}
            
            Supporting Document User Comment: ${supportingDoc.userComment || 'No comment provided.'}
            
            Task: Analyze Document B. Explain its relationship to Document A. Does it amend, contradict, prove compliance, or provide context to it? Identify key connections and risk implications.
            Provide the analysis in ${langName} language.
           `;
           
           const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { mimeType: mimeType, data: base64Data } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: supportingDocSchema
                }
           });
           
           const responseText = result.text;
           if (!responseText) throw new Error("Empty response from AI");

           const analysisData = JSON.parse(responseText);
           
           setAllSessions(prev => prev.map(s => {
               if(s.id === sessionId) {
                   const updatedDocs = (s.supportingDocuments || []).map(d => 
                       d.id === supportingDoc.id ? { ...d, status: 'completed' as const, analysis: analysisData } : d
                   );
                   return { ...s, supportingDocuments: updatedDocs };
               }
               return s;
           }));

           addNotification('success', 'Supporting Doc Analyzed', `"${supportingDoc.fileName}" analysis is ready.`);

      } catch (err) {
          console.error("Supporting analysis failed", err);
          setAllSessions(prev => prev.map(s => {
               if(s.id === sessionId) {
                   const updatedDocs = (s.supportingDocuments || []).map(d => 
                       d.id === supportingDoc.id ? { ...d, status: 'error' as const } : d
                   );
                   return { ...s, supportingDocuments: updatedDocs };
               }
               return s;
           }));
           addNotification('error', 'Analysis Failed', `Could not analyze supporting document "${supportingDoc.fileName}".`);
      }
  };

  const addSupportingDocument = async (sessionId: string, file: File, userComment?: string) => {
      if(!currentUser) return;
      
      const base64File = await fileToBase64(file);
      const newDoc: SupportingDocument = {
          id: `supp_${Date.now()}`,
          fileName: file.name,
          fileType: file.type,
          base64File: base64File,
          userComment,
          analysis: null,
          status: 'processing',
          createdAt: Date.now()
      };
      
      setAllSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
              return { ...s, supportingDocuments: [...(s.supportingDocuments || []), newDoc] };
          }
          return s;
      }));
      
      // Start analysis
      analyzeSupportingDocument(sessionId, newDoc, base64File);
  };

  const startQuizGeneration = async (sessionId: string) => {
      const session = allSessions.find(s => s.id === sessionId);
      if (!session || !session.analysisResult) return;

      const newQuizId = `q_${Date.now()}`;
      
      // Create a placeholder quiz immediately with status 'generating'
      const placeholderQuiz: QuizAttempt = {
          id: newQuizId,
          date: Date.now(),
          totalQuestions: 0,
          questions: [],
          status: 'generating'
      };

      setAllSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
              return {
                  ...s,
                  quizGenerationStatus: 'generating',
                  quizHistory: [placeholderQuiz, ...(s.quizHistory || [])]
              };
          }
          return s;
      }));

      try {
          const ai = new GoogleGenAI({ apiKey: getApiKey() });
          
          let supportingContext = '';
          if (session.supportingDocuments && session.supportingDocuments.length > 0) {
              const completedDocs = session.supportingDocuments.filter(d => d.status === 'completed' && d.analysis);
              if (completedDocs.length > 0) {
                   supportingContext = `
                   **Supporting Documents Context:**
                   The following documents are related to the primary document. Include questions that test understanding of these connections.
                   ${completedDocs.map(d => `
                   - Document: ${d.fileName}
                     Summary: ${d.analysis?.summary}
                     Relevance: ${d.analysis?.relevanceToPrimary}
                   `).join('\n')}
                   `;
              }
          }

          const langName = availableLanguages.find(l => l.code === language)?.name || 'English';

          const prompt = `You are an expert legal educator. Your task is to create a challenging and informative quiz based on the provided legal document analysis.
  
  Based on the following JSON analysis of a legal document, generate a quiz of 10-15 multiple-choice questions.
  The questions and answers must be in ${langName} language.
  
  **Requirements:**
  1.  **Question Count:** Generate between 10 and 15 questions.
  2.  **Question Mix:** Mix theory-based and scenario-based questions.
  3.  **Constitutional Clause Priority:** If applicable, include questions on constitutional clauses.
  4.  **Supporting Documents:** If supporting document context is provided, ensure some questions relate to how they interact with the primary document.
  
  **Document Analysis JSON:**
  ---
  ${JSON.stringify(session.analysisResult)}
  ---
  
  ${supportingContext}
  `;
  
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-pro',
              contents: prompt,
              config: {
                  temperature: 0.5,
                  responseMimeType: "application/json",
                  responseSchema: quizSchema
              }
          });
          
          const responseText = response.text;
          if (!responseText) throw new Error("Empty response from AI");

          const result = JSON.parse(responseText.trim());
          if (!result.quiz || result.quiz.length === 0) throw new Error("No quiz generated");
  
          // Update the placeholder quiz with real data
          setAllSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                  return {
                      ...s,
                      quizGenerationStatus: 'completed',
                      quizHistory: s.quizHistory?.map(q => 
                          q.id === newQuizId 
                          ? { ...q, totalQuestions: result.quiz.length, questions: result.quiz, status: 'unattempted' } 
                          : q
                      )
                  };
              }
              return s;
          }));

          addNotification('success', 'Quiz Ready', `A new quiz for "${session.fileName}" has been generated successfully.`);

          return newQuizId;

      } catch (err) {
          console.error("Quiz generation failed", err);
          
          // Update status to error
          setAllSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                  return {
                      ...s,
                      quizGenerationStatus: 'error',
                       quizHistory: s.quizHistory?.map(q => 
                          q.id === newQuizId 
                          ? { ...q, status: 'error' } 
                          : q
                      )
                  };
              }
              return s;
          }));
          addNotification('error', 'Quiz Generation Failed', `Could not generate quiz for "${session.fileName}".`);
      }
  };

  const startDomainQuizGeneration = async (domain: string, options?: { subTopics?: string[], type?: 'theory' | 'scenario' | 'mixed' }) => {
      const newQuizId = `q_dom_${Date.now()}`;

      // Create a placeholder quiz immediately
      const placeholderQuiz: QuizAttempt = {
          id: newQuizId,
          date: Date.now(),
          totalQuestions: 0,
          questions: [],
          status: 'generating'
      };

      setDomainQuizzes(prev => ({
          ...prev,
          [domain]: [placeholderQuiz, ...(prev[domain] || [])]
      }));

      try {
          const ai = new GoogleGenAI({ apiKey: getApiKey() });
          
          const typeInstruction = options?.type === 'theory' ? 'Focus purely on theoretical legal knowledge and principles.' :
                            options?.type === 'scenario' ? 'Focus purely on practical scenario-based application and case studies.' :
                            'Mix theory-based and scenario-based questions.';
    
          const topicInstruction = options?.subTopics && options.subTopics.length > 0 
              ? `Focus specifically on these topics: ${options.subTopics.join(', ')}.` 
              : '';

          const langName = availableLanguages.find(l => l.code === language)?.name || 'English';

          const prompt = `You are an expert legal educator specializing in Indian Law.
          Generate a challenging 10-question multiple-choice quiz about "${domain}".
          The questions and answers must be in ${langName} language.
          
          Requirements:
          1. ${topicInstruction}
          2. ${typeInstruction}
          3. Ensure accuracy and relevance to Indian Law.
          
          Respond in JSON format according to the schema provided.`;
          
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-pro',
              contents: prompt,
              config: {
                  temperature: 0.5,
                  responseMimeType: "application/json",
                  responseSchema: quizSchema
              }
          });
          
          const responseText = response.text;
          if (!responseText) throw new Error("Empty response from AI");

          const result = JSON.parse(responseText.trim());
          if (!result.quiz || result.quiz.length === 0) throw new Error("No quiz generated");

          // Update placeholder with real data
          setDomainQuizzes(prev => ({
              ...prev,
              [domain]: prev[domain]?.map(q => 
                  q.id === newQuizId 
                  ? { ...q, totalQuestions: result.quiz.length, questions: result.quiz, status: 'unattempted' }
                  : q
              ) || []
          }));
          
          addNotification('success', 'Domain Quiz Ready', `A new quiz for "${domain}" is ready.`);

          return newQuizId;

      } catch (err) {
          console.error("Domain quiz generation failed", err);
          
          // Update status to error
          setDomainQuizzes(prev => ({
              ...prev,
              [domain]: prev[domain]?.map(q => 
                  q.id === newQuizId 
                  ? { ...q, status: 'error' }
                  : q
              ) || []
          }));

          addNotification('error', 'Quiz Generation Failed', `Could not generate quiz for "${domain}".`);
          return undefined; 
      }
  };
  
  const addSession = async (file: File, folderId: string | null = null): Promise<string> => {
    if (!currentUser) throw new Error("User not logged in");
    
    const base64File = await fileToBase64(file);
    
    // Simulate page count (5 to 50 pages)
    const randomPageCount = Math.floor(Math.random() * 45) + 5;
    // Simulate token usage (e.g., 500 to 5000 tokens)
    const randomTokenUsage = Math.floor(Math.random() * 4500) + 500;
    
    const newSession: DocumentSession = {
        id: `doc_${Date.now()}`,
        userId: currentUser.email,
        fileName: file.name,
        fileType: file.type,
        base64File: base64File,
        pageCount: randomPageCount,
        tokenUsage: randomTokenUsage, // Added token usage
        status: 'processing',
        analysisResult: null,
        chatHistory: [],
        createdAt: Date.now(),
        title: file.name,
        isPinned: false,
        folderId: folderId,
        supportingDocuments: []
    };

    setAllSessions(prev => [newSession, ...prev]);
    // Analysis is started in background, notifications handled there
    startAnalysis(newSession); 
    
    return newSession.id;
  };

  const saveQuizResult = (documentId: string, quizId: string, score: number, userAnswers: number[]) => {
      setAllSessions(prev => prev.map(s => {
          if (s.id === documentId && s.quizHistory) {
              return {
                  ...s,
                  quizHistory: s.quizHistory.map(q => 
                      q.id === quizId 
                      ? { ...q, status: 'completed', score, userAnswers } 
                      : q
                  )
              };
          }
          return s;
      }));
  };

  const saveDomainQuizResult = (domain: string, quizId: string, score: number, userAnswers: number[]) => {
      setDomainQuizzes(prev => ({
          ...prev,
          [domain]: prev[domain]?.map(q => 
              q.id === quizId 
              ? { ...q, status: 'completed', score, userAnswers }
              : q
          ) || []
      }));
  };

  const deleteDomainQuizAttempt = (domain: string, attemptId: string) => {
      setDomainQuizzes(prev => ({
          ...prev,
          [domain]: prev[domain]?.filter(q => q.id !== attemptId) || []
      }));
  };
  
  const clearUserData = () => {
    if (!currentUser) return;
    setAllSessions(prev => prev.filter(s => s.userId !== currentUser.email));
    setAllFolders(prev => prev.filter(f => f.userId !== currentUser.email));
    setDomainQuizzes({}); // Clears all domain quizzes (as they are not user-scoped in this prototype)
  };

  const value = useMemo(() => ({ 
      sessions: allSessions.filter(s => s.userId === currentUser?.email),
      folders: allFolders.filter(f => f.userId === currentUser?.email),
      addSession,
      addSupportingDocument,
      getSession: (id: string) => allSessions.find(s => s.id === id), 
      updateSession,
      deleteSession: (id: string) => setAllSessions(p => p.filter(s => s.id !== id)), 
      togglePin: (id: string) => setAllSessions(p => p.map(s => s.id === id ? {...s, isPinned: !s.isPinned} : s)),
      addFolder: (name: string, icon: string) => setAllFolders(p => [...p, {id: `f_${Date.now()}`, userId: currentUser!.email, name, icon, createdAt: Date.now()}]),
      updateFolder: (id: string, u: any) => setAllFolders(p => p.map(f => f.id === id ? {...f, ...u} : f)),
      deleteFolder: (id: string, o: any) => {
           setAllFolders(p => p.filter(f => f.id !== id));
           if (o.deleteDocuments) setAllSessions(p => p.filter(s => s.folderId !== id));
           else setAllSessions(p => p.map(s => s.folderId === id ? {...s, folderId: null} : s));
      },
      getFolder: (id: string) => allFolders.find(f => f.id === id),
      saveQuizResult,
      deleteQuizAttempt: (did: string, qid: string) => setAllSessions(p => p.map(s => s.id === did ? {...s, quizHistory: (s.quizHistory||[]).filter(q => q.id !== qid)} : s)),
      startQuizGeneration,
      domainQuizzes,
      startDomainQuizGeneration,
      saveDomainQuizResult,
      deleteDomainQuizAttempt,
      clearUserData
  }), [allSessions, allFolders, domainQuizzes, currentUser, updateSession, language]);

  return <DocumentContext.Provider value={value as any}>{children}</DocumentContext.Provider>;
};
export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) throw new Error('useDocuments must be used within a DocumentProvider');
  return context;
};

// --- TOOLS CONTEXT (DocGen & Compare) ---
const DOC_GEN_KEY = 'generatedDocHistory';

interface ToolsContextType {
    docGenHistory: GeneratedDoc[];
    generateDocument: (prompt: string) => Promise<void>;
    redraftDocument: (originalDoc: GeneratedDoc, instruction: string) => Promise<void>;
    updateGeneratedDoc: (doc: GeneratedDoc) => void;
    deleteGeneratedDoc: (id: string) => void;
    // Comparison
    compareHistory: ComparisonHistoryItem[];
    compareDocuments: (docA: DocumentSession, docB: DocumentSession) => Promise<void>;
    deleteComparison: (id: string) => void;
    clearUserData: () => void;
}
const ToolsContext = createContext<ToolsContextType | null>(null);
const ToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { addNotification } = useNotification();
    const { language } = useLanguage();
    
    const [docGenHistory, setDocGenHistory] = useState<GeneratedDoc[]>(() => {
        try { return JSON.parse(localStorage.getItem(DOC_GEN_KEY) || '[]'); } catch { return []; }
    });
    
    const [compareHistory, setCompareHistory] = useState<ComparisonHistoryItem[]>(() => {
        try { return JSON.parse(localStorage.getItem('compareHistory') || '[]'); } catch { return []; }
    });

    useEffect(() => {
        try {
            localStorage.setItem(DOC_GEN_KEY, JSON.stringify(docGenHistory));
        } catch (e) { console.error("Storage error", e); }
    }, [docGenHistory]);

    useEffect(() => {
        try {
            localStorage.setItem('compareHistory', JSON.stringify(compareHistory));
        } catch (e) { console.error("Storage error", e); }
    }, [compareHistory]);
    
    const getMyDocs = () => docGenHistory.filter(d => d.userId === currentUser?.email);
    const getMyComparisons = () => compareHistory.filter(c => c.userId === currentUser?.email).sort((a,b) => b.date - a.date);

    const generateDocument = async (prompt: string) => {
        if (!currentUser) return;
        const newId = `gen_${Date.now()}`;
        const newDoc: GeneratedDoc = {
            id: newId,
            userId: currentUser.email,
            title: prompt.split(' ').slice(0, 6).join(' ') + '...', 
            initialPrompt: prompt,
            documentContent: '',
            createdAt: Date.now(),
            status: 'generating'
        };
        
        setDocGenHistory(prev => [newDoc, ...prev]);

        try {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            const langName = availableLanguages.find(l => l.code === language)?.name || 'English';

            const streamResponse = await ai.models.generateContentStream({
                model: 'gemini-2.5-pro',
                contents: [
                    { role: 'user', parts: [{ text: `You are an expert legal drafter. Create a professional legal document based on the following request. 
                    The document must be drafted in ${langName} language.
                    Use Markdown formatting. Do not include conversational filler, just the document.` }] },
                    { role: 'user', parts: [{ text: prompt }] }
                ],
            });

            let fullText = '';
            for await (const chunk of streamResponse) {
                const chunkText = chunk.text;
                if (chunkText) {
                    fullText += chunkText;
                    setDocGenHistory(prev => prev.map(d => d.id === newId ? { ...d, documentContent: fullText } : d));
                }
            }
            setDocGenHistory(prev => prev.map(d => d.id === newId ? { ...d, status: 'completed' } : d));
            addNotification('success', 'Document Generated', `"${newDoc.title}" has been successfully drafted.`);

        } catch (err) {
            console.error(err);
            setDocGenHistory(prev => prev.map(d => d.id === newId ? { ...d, status: 'error', documentContent: 'Failed to generate document.' } : d));
            addNotification('error', 'Generation Failed', `Could not draft document from your prompt.`);
        }
    };

    const redraftDocument = async (originalDoc: GeneratedDoc, instruction: string) => {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        // We update the existing doc to 'generating' status to show spinner
        setDocGenHistory(prev => prev.map(d => d.id === originalDoc.id ? { ...d, status: 'generating', documentContent: '' } : d));
        const langName = availableLanguages.find(l => l.code === language)?.name || 'English';

        const updatedContentPrompt = `You are an expert legal editor.
        Current Document Content:
        ${originalDoc.documentContent}
        
        User Instruction:
        ${instruction}
        
        Task: Update the document based on the user instruction. Keep the rest of the document as is unless the instruction requires specific changes. 
        The updated document must be in ${langName} language.
        Return the full updated document in Markdown format. Do not include conversational text or explanations, only the document.`;

        try {
            const streamResponse = await ai.models.generateContentStream({
                model: 'gemini-2.5-pro',
                contents: [{ role: 'user', parts: [{ text: updatedContentPrompt }] }],
            });

            let fullText = '';
            for await (const chunk of streamResponse) {
                 const chunkText = chunk.text;
                if (chunkText) {
                    fullText += chunkText;
                    setDocGenHistory(prev => prev.map(d => d.id === originalDoc.id ? { ...d, documentContent: fullText } : d));
                }
            }
            setDocGenHistory(prev => prev.map(d => d.id === originalDoc.id ? { ...d, status: 'completed' } : d));
            addNotification('success', 'Document Redrafted', `"${originalDoc.title}" has been updated.`);

        } catch (err) {
            console.error(err);
            // Restore original on error
             setDocGenHistory(prev => prev.map(d => d.id === originalDoc.id ? { ...d, status: 'completed', documentContent: originalDoc.documentContent } : d));
             addNotification('error', 'Redraft Failed', `Could not update document "${originalDoc.title}".`);
        }
    };

    const updateGeneratedDoc = (doc: GeneratedDoc) => {
        setDocGenHistory(prev => prev.map(d => d.id === doc.id ? doc : d));
    };

    const deleteGeneratedDoc = (id: string) => {
        setDocGenHistory(prev => prev.filter(d => d.id !== id));
    };

    const compareDocuments = async (docA: DocumentSession, docB: DocumentSession) => {
        if (!currentUser) return;
        const newId = `comp_${Date.now()}`;
        
        const newItem: ComparisonHistoryItem = {
            id: newId,
            userId: currentUser.email,
            docAId: docA.id,
            docAName: docA.fileName,
            docBId: docB.id,
            docBName: docB.fileName,
            date: Date.now(),
            status: 'processing'
        };

        setCompareHistory(prev => [newItem, ...prev]);

        try {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            
            const prompt = `Compare these two legal documents.
            Document A: ${docA.fileName}
            Document B: ${docB.fileName}
            
            Identify key differences, additions, and removals. Focus on legal obligations, dates, and liabilities.
            Provide:
            1. A summary of changes.
            2. A list of differences with category, type (Added/Removed/Modified), description, impact (Critical/High/Medium/Low), and if possible, the original vs new text snippets.
            3. A conclusion on the overall impact of changes.
            `;

            const comparisonSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    differences: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                category: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['Added', 'Removed', 'Modified'] },
                                description: { type: Type.STRING },
                                impact: { type: Type.STRING, enum: ['Critical', 'High', 'Medium', 'Low'] },
                                originalClause: { type: Type.STRING },
                                newClause: { type: Type.STRING }
                            },
                            required: ['category', 'type', 'description', 'impact']
                        }
                    },
                    conclusion: { type: Type.STRING }
                },
                required: ['summary', 'differences', 'conclusion']
            };

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                         { text: "Document A:" },
                         { inlineData: { mimeType: docA.fileType || 'application/pdf', data: docA.base64File.split(',')[1] } },
                         { text: "Document B:" },
                         { inlineData: { mimeType: docB.fileType || 'application/pdf', data: docB.base64File.split(',')[1] } },
                         { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: comparisonSchema
                }
            });

            const responseText = result.text;
             if (!responseText) throw new Error("Empty response");
             const analysis = JSON.parse(responseText);
             
             setCompareHistory(prev => prev.map(c => c.id === newId ? { ...c, status: 'completed', result: analysis } : c));
             addNotification('success', 'Comparison Complete', `Comparison of "${docA.fileName}" vs "${docB.fileName}" is ready.`);

        } catch (err) {
            console.error(err);
             setCompareHistory(prev => prev.map(c => c.id === newId ? { ...c, status: 'error' } : c));
             addNotification('error', 'Comparison Failed', `Could not compare documents.`);
        }
    };

    const deleteComparison = (id: string) => {
        setCompareHistory(prev => prev.filter(c => c.id !== id));
    };

    const clearUserData = () => {
        if (!currentUser) return;
        setDocGenHistory(prev => prev.filter(d => d.userId !== currentUser.email));
        setCompareHistory(prev => prev.filter(c => c.userId !== currentUser.email));
    };

    const value = useMemo(() => ({
        docGenHistory: getMyDocs(),
        generateDocument,
        redraftDocument,
        updateGeneratedDoc,
        deleteGeneratedDoc,
        compareHistory: getMyComparisons(),
        compareDocuments,
        deleteComparison,
        clearUserData
    }), [docGenHistory, compareHistory, currentUser, language]);

    return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
};
export const useTools = () => {
    const context = useContext(ToolsContext);
    if (!context) throw new Error('useTools must be used within a ToolsProvider');
    return context;
};


// --- CALENDAR CONTEXT ---
interface CalendarContextType {
  events: CalendarEvent[];
  addEvent: (eventData: Omit<CalendarEvent, 'id' | 'userId'>) => void;
  updateEvent: (id: string, updates: Partial<Omit<CalendarEvent, 'id' | 'userId'>>) => void;
  deleteEvent: (id: string) => void;
  isEventModalOpen: boolean;
  openEventModal: (data: Omit<CalendarEvent, 'id' | 'userId'>) => void;
  closeEventModal: () => void;
  isFullCalendarOpen: boolean;
  openFullCalendar: () => void;
  closeFullCalendar: () => void;
  modalInitialData: Omit<CalendarEvent, 'id' | 'userId'> | null;
  clearUserData: () => void;
}
const CalendarContext = createContext<CalendarContextType | null>(null);

// New Hook Export
export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) throw new Error('useCalendar must be used within a CalendarProvider');
  return context;
};

const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>(() => {
      try { return localStorage.getItem('calendarEvents') ? JSON.parse(localStorage.getItem('calendarEvents')!) : []; }
      catch { return []; }
    });
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isFullCalendarOpen, setIsFullCalendarOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<Omit<CalendarEvent, 'id' | 'userId'> | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem('calendarEvents', JSON.stringify(events));
        } catch (e) { console.error("Storage error", e); }
    }, [events]);

    const addEvent = (data: Omit<CalendarEvent, 'id' | 'userId'>) => {
        if(!currentUser) return;
        const newEvent: CalendarEvent = {
            ...data,
            id: `evt_${Date.now()}`,
            userId: currentUser.email
        };
        setEvents(prev => [...prev, newEvent]);
        setIsEventModalOpen(false);
    };

    const updateEvent = (id: string, updates: Partial<Omit<CalendarEvent, 'id' | 'userId'>>) => {
         setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
         setIsEventModalOpen(false);
    };

    const deleteEvent = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        setIsEventModalOpen(false);
    };

    const openEventModal = (data: Omit<CalendarEvent, 'id' | 'userId'>) => {
        setModalInitialData(data);
        setIsEventModalOpen(true);
    };

    const closeEventModal = () => {
        setIsEventModalOpen(false);
        setModalInitialData(null);
    };

    const openFullCalendar = () => setIsFullCalendarOpen(true);
    const closeFullCalendar = () => setIsFullCalendarOpen(false);

    const clearUserData = () => {
        if (!currentUser) return;
        setEvents(prev => prev.filter(e => e.userId !== currentUser.email));
    };

    const value = {
        events: events.filter(e => e.userId === currentUser?.email),
        addEvent, updateEvent, deleteEvent,
        isEventModalOpen, openEventModal, closeEventModal,
        isFullCalendarOpen, openFullCalendar, closeFullCalendar,
        modalInitialData,
        clearUserData
    };
    return (
        <CalendarContext.Provider value={value}>
            {children}
            <FullCalendarModal />
            <EventFormModal />
        </CalendarContext.Provider>
    );
};

const EventFormModal = () => {
    const { isEventModalOpen, closeEventModal, modalInitialData, addEvent, updateEvent, deleteEvent } = useCalendar();
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    const { addNotification } = useNotification();

    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [reminder, setReminder] = useState('none');
    const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
    const [error, setError] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    useEffect(() => {
        if (isEventModalOpen && modalInitialData) {
            setTitle(modalInitialData.title);
            const d = new Date(modalInitialData.date);
            const offset = d.getTimezoneOffset() * 60000;
            const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
            setDate(localISOTime);
            setDescription(modalInitialData.description || '');
            setReminder(modalInitialData.reminder || 'none');
            setRecurrence(modalInitialData.recurrence || 'none');
            setIsConfirmingDelete(false);
        } else {
            setTitle('');
            setDate('');
            setDescription('');
            setReminder('none');
            setRecurrence('none');
        }
        setError('');
    }, [isEventModalOpen, modalInitialData]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                closeEventModal();
            }
        };
        if (isEventModalOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEventModalOpen, closeEventModal]);

    if (!isEventModalOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError(t('calendar.emptyTitleError'));
            return;
        }
        const eventData = {
            title,
            date: new Date(date).getTime(),
            description,
            reminder,
            recurrence,
            documentId: modalInitialData?.documentId,
            documentTitle: modalInitialData?.documentTitle
        };

        if (modalInitialData && 'id' in (modalInitialData as any)) {
            updateEvent((modalInitialData as any).id, eventData);
        } else {
            addEvent(eventData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {modalInitialData && 'id' in (modalInitialData as any) ? t('calendar.editTitle') : t('calendar.title')}
                    </h2>
                    <button onClick={closeEventModal} className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('calendar.eventName')}</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('calendar.eventDate')}</label>
                        <input 
                            type="datetime-local" 
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('calendar.reminder')}</label>
                            <div className="relative">
                                <Bell className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <select 
                                    value={reminder}
                                    onChange={e => setReminder(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary outline-none appearance-none"
                                >
                                    <option value="none">{t('calendar.reminderOptions.none')}</option>
                                    <option value="15m">{t('calendar.reminderOptions.m15')}</option>
                                    <option value="1h">{t('calendar.reminderOptions.h1')}</option>
                                    <option value="1d">{t('calendar.reminderOptions.d1')}</option>
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('calendar.recurrence')}</label>
                            <div className="relative">
                                <Repeat className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <select 
                                    value={recurrence}
                                    onChange={e => setRecurrence(e.target.value as any)}
                                    className="w-full pl-10 pr-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary outline-none appearance-none"
                                >
                                    <option value="none">{t('calendar.recurrenceOptions.none')}</option>
                                    <option value="daily">{t('calendar.recurrenceOptions.daily')}</option>
                                    <option value="weekly">{t('calendar.recurrenceOptions.weekly')}</option>
                                    <option value="monthly">{t('calendar.recurrenceOptions.monthly')}</option>
                                    <option value="yearly">{t('calendar.recurrenceOptions.yearly')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('calendar.eventDesc')}</label>
                        <textarea 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={t('calendar.placeholderNotes')}
                            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary outline-none h-24 resize-none"
                        />
                    </div>
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <div className="flex gap-3 pt-2">
                        {modalInitialData && 'id' in (modalInitialData as any) && (
                             isConfirmingDelete ? (
                                <div className="flex gap-2 animate-fade-in-up">
                                     <button 
                                        type="button"
                                        onClick={() => deleteEvent((modalInitialData as any).id)}
                                        className="px-3 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md text-sm font-bold shadow-sm whitespace-nowrap"
                                    >
                                        {t('layout.delete')}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setIsConfirmingDelete(false)}
                                        className="px-3 py-2 bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 rounded-md text-sm font-medium whitespace-nowrap"
                                    >
                                        {t('dashboard.cancel')}
                                    </button>
                                </div>
                             ) : (
                                <button 
                                    type="button"
                                    onClick={() => setIsConfirmingDelete(true)}
                                    className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-md transition-colors"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                             )
                        )}
                        <button 
                            type="submit" 
                            className="flex-1 bg-primary text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold"
                        >
                            {modalInitialData && 'id' in (modalInitialData as any) ? t('calendar.update') : t('calendar.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FullCalendarModal = () => {
    const { isFullCalendarOpen, closeFullCalendar, events, openEventModal, isEventModalOpen } = useCalendar();
    const { t } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());
    const modalRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isEventModalOpen) return;
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                closeFullCalendar();
            }
        };
        if (isFullCalendarOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFullCalendarOpen, closeFullCalendar, isEventModalOpen]);

    if (!isFullCalendarOpen) return null;

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const renderCalendarGrid = () => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"></div>);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
            const isToday = new Date().toDateString() === currentDayDate.toDateString();

            const dayEvents = events.filter(e => {
                const eventDate = new Date(e.date);
                if (!e.recurrence || e.recurrence === 'none') {
                    return eventDate.getDate() === d && eventDate.getMonth() === currentDate.getMonth() && eventDate.getFullYear() === currentDate.getFullYear();
                }
                const eventStartDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                if (eventStartDay > currentDayDate) return false;
                if (e.recurrence === 'daily') return true;
                if (e.recurrence === 'weekly') return eventDate.getDay() === currentDayDate.getDay();
                if (e.recurrence === 'monthly') return eventDate.getDate() === d;
                if (e.recurrence === 'yearly') return eventDate.getDate() === d && eventDate.getMonth() === currentDate.getMonth();
                return false;
            });
            
            days.push(
                <div key={d} className={`h-24 p-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden group relative hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors ${isToday ? 'ring-2 ring-inset ring-primary' : ''}`}>
                    <span className={`text-xs font-semibold p-1 rounded-full ${isToday ? 'bg-primary text-white' : 'text-slate-500 dark:text-slate-400'}`}>{d}</span>
                    <div className="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-1.5rem)]">
                        {dayEvents.map(ev => (
                            <button 
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); openEventModal({...ev} as any); }}
                                className="block w-full text-left text-[10px] truncate bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors flex items-center gap-1"
                                title={ev.title}
                            >
                                {ev.recurrence && ev.recurrence !== 'none' && <Repeat className="h-2 w-2 flex-shrink-0" />}
                                {ev.title}
                            </button>
                        ))}
                    </div>
                     <button 
                        onClick={() => openEventModal({ title: '', date: new Date(currentDate.getFullYear(), currentDate.getMonth(), d, 9, 0).getTime(), description: '' })}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary"
                    >
                        <PlusCircle className="h-4 w-4" />
                    </button>
                </div>
            );
        }
        return days;
    };

    const changeMonth = (delta: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[55] flex items-center justify-center p-4 backdrop-blur-sm">
            <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col animate-fade-in-up">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                        {t('calendar.fullCalendarTitle')}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronLeft className="h-5 w-5" /></button>
                            <span className="font-semibold w-32 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronRight className="h-5 w-5" /></button>
                        </div>
                        <button onClick={closeFullCalendar} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto bg-slate-100 dark:bg-black/20">
                    <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {t(`calendar.${day.toLowerCase()}`)}
                            </div>
                        ))}
                        {renderCalendarGrid()}
                    </div>
                </div>
            </div>
        </div>
    );
}

const SidebarEventsWidget: React.FC = () => {
     const { events, openFullCalendar, openEventModal } = useCalendar();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(true);

    const upcomingEvents = events
        .filter(e => e.date >= Date.now() || e.recurrence !== 'none') // Include recurring events
        .sort((a, b) => a.date - b.date)
        .slice(0, 3);

    return (
        <div className="px-4 py-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-2 group"
            >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{t('layout.upcomingEvents')}</span>
                </div>
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
            </button>
            
            <div className={`space-y-2 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                {upcomingEvents.length > 0 ? upcomingEvents.map(ev => (
                    <div 
                        key={ev.id} 
                        onClick={() => openEventModal({...ev} as any)}
                        className="bg-white dark:bg-slate-700/50 p-2 rounded border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary dark:hover:border-primary transition-colors group"
                    >
                        <div className="flex justify-between items-start">
                             <div className="flex items-center gap-1 overflow-hidden pr-1">
                                {ev.recurrence && ev.recurrence !== 'none' && <Repeat className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{ev.title}</p>
                             </div>
                             <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(ev.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                        </div>
                        <p className="text-slate-500 text-[10px] truncate">{ev.description || t('calendar.noEvents')}</p>
                    </div>
                )) : (
                    <p className="text-xs text-slate-400 italic p-2 text-center">{t('layout.noUpcomingEvents')}</p>
                )}
                
                <button 
                    onClick={openFullCalendar}
                    className="w-full text-xs text-center py-1.5 text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors mt-1"
                >
                    {t('layout.openFullCalendar')}
                </button>
            </div>
        </div>
    );
};

const FolderModal: React.FC<{ isOpen: boolean; onClose: () => void; folderToEdit?: Folder | null }> = ({ isOpen, onClose, folderToEdit }) => {
    const { addFolder, updateFolder } = useDocuments();
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('folder');
    const modalRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
        if (isOpen) {
            if (folderToEdit) {
                setName(folderToEdit.name);
                setSelectedIcon(folderToEdit.icon);
            } else {
                setName('');
                setSelectedIcon('folder');
            }
        }
    }, [isOpen, folderToEdit]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if(isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);
  
    if (!isOpen) return null;
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) {
        if (folderToEdit) {
            updateFolder(folderToEdit.id, { name: name.trim(), icon: selectedIcon });
        } else {
            addFolder(name.trim(), selectedIcon);
        }
        onClose();
      }
    };
  
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
         <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {folderToEdit ? t('layout.editFolder') : t('layout.createFolder')}
                </h2>
                <button onClick={onClose} className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-1">
                    <X className="h-5 w-5" />
                </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('layout.folderName')}</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary outline-none"
                        placeholder="e.g., Case #123"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('layout.selectIcon')}</label>
                    <div className="grid grid-cols-4 gap-2">
                        {FOLDER_ICONS.map(({ id, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setSelectedIcon(id)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${selectedIcon === id ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                <Icon className="h-5 w-5 mb-1" />
                            </button>
                        ))}
                    </div>
                </div>
                <div className="pt-2">
                    <button 
                        type="submit" 
                        className="w-full bg-primary text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-semibold"
                    >
                        {folderToEdit ? t('layout.saveChanges') : t('layout.createFolder')}
                    </button>
                </div>
            </form>
         </div>
      </div>
    );
};

const DeleteFolderModal: React.FC<{ isOpen: boolean; onClose: () => void; folder: Folder | null }> = ({ isOpen, onClose, folder }) => {
    const { deleteFolder } = useDocuments();
    const { t } = useLanguage();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || !folder) return null;

    const handleDelete = (deleteDocuments: boolean) => {
        deleteFolder(folder.id, { deleteDocuments });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="h-6 w-6" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('layout.deleteFolderConfirmTitle', { folderName: folder.name })}</h2>
                     </div>
                    <button onClick={onClose} className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {t('layout.deleteFolderConfirmDesc')}
                </p>
                <div className="space-y-3">
                    <button 
                        onClick={() => handleDelete(false)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                        <span className="font-medium text-slate-700 dark:text-slate-300">{t('layout.deleteFolderOptionMove')}</span>
                        <CornerUpLeft className="h-5 w-5 text-slate-400" />
                    </button>
                    <button 
                        onClick={() => handleDelete(true)}
                        className="w-full flex flex-col items-start p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-left group"
                    >
                        <div className="w-full flex items-center justify-between">
                             <span className="font-medium text-red-600 dark:text-red-400">{t('layout.deleteFolderOptionDelete')}</span>
                             <Trash2 className="h-5 w-5 text-red-500" />
                        </div>
                        <span className="text-xs text-red-500/70 mt-1">{t('layout.deleteFolderOptionDeleteDesc')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationProvider>
            <DocumentProvider>
                <ToolsProvider>
                    <CalendarProvider>
                    <HashRouter>
                        <ThemeApplicator />
                        <Routes>
                        <Route path="/login" element={<AuthPage />} />
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        <Route path="/*" element={
                            <MainLayoutWrapper />
                        } />
                        </Routes>
                    </HashRouter>
                    </CalendarProvider>
                </ToolsProvider>
            </DocumentProvider>
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

const MainLayoutWrapper = () => {
    const { currentUser, loading } = useAuth();
    
    // Lazy loading MainLayout equivalent for this snippets sake to keep it valid
    const DashboardPageLazy = React.lazy(() => import('./pages/DashboardPage'));
    const AnalysisPageLazy = React.lazy(() => import('./pages/AnalysisPage'));
    const DocGeneratorPageLazy = React.lazy(() => import('./pages/DocGeneratorPage'));
    const ComparePageLazy = React.lazy(() => import('./pages/ComparePage'));
    const QuizPageLazy = React.lazy(() => import('./pages/QuizPage'));
    const SettingsPageLazy = React.lazy(() => import('./pages/SettingsPage'));

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    if (!currentUser) return <Navigate to="/login" />;
    
    return (
        <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
             <MainLayout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPageLazy />} />
                  <Route path="/dashboard/folder/:folderId" element={<DashboardPageLazy />} />
                  <Route path="/analysis/:documentId" element={<AnalysisPageLazy />} />
                  <Route path="/doc-generator" element={<DocGeneratorPageLazy />} />
                  <Route path="/compare" element={<ComparePageLazy />} />
                  <Route path="/quiz" element={<QuizPageLazy />} />
                  <Route path="/settings" element={<SettingsPageLazy />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
             </MainLayout>
        </React.Suspense>
    );
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useLanguage();
    const { folders, updateSession } = useDocuments();
    const { theme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { folderId } = useParams();
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const navItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: t('layout.dashboard') },
      { path: '/doc-generator', icon: FilePlus2, label: t('layout.docGenerator') },
      { path: '/compare', icon: FileDiff, label: t('layout.compareDocs') },
      { path: '/quiz', icon: Swords, label: t('layout.quiz') },
    ];

    const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
        e.preventDefault();
        const sessionId = e.dataTransfer.getData('sessionId');
        if (sessionId) {
          updateSession(sessionId, { folderId: targetFolderId });
        }
    };

    const handleOpenCreateModal = () => {
        setFolderToEdit(null);
        setIsFolderModalOpen(true);
    };

    const handleOpenEditModal = (folder: Folder) => {
        setFolderToEdit(folder);
        setIsFolderModalOpen(true);
        setActiveMenuId(null);
    };

    const handleOpenDeleteModal = (folder: Folder) => {
        setFolderToDelete(folder);
        setActiveMenuId(null);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeMenuId && !(event.target as Element).closest('.folder-menu-container')) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId]);

    return (
      <div className="flex h-screen">
        <nav className="w-64 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border-r border-slate-200 dark:border-slate-700 flex flex-col p-4">
          <div className="flex items-center space-x-2 mb-8">
            <FileText className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{t('layout.appName')}</span>
          </div>
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.path}>
                <Link to={item.path} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location.pathname === item.path && !folderId ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>
          
          {/* Folders Section */}
          <div className="flex-grow overflow-y-auto">
            <div className="flex justify-between items-center mb-2 px-2 group">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('layout.caseFolders')}</h3>
                <button onClick={handleOpenCreateModal} className="text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-0.5 transition-colors" title={t('layout.createFolder')}>
                    <Plus className="h-4 w-4" />
                </button>
            </div>
             <ul className="space-y-1">
                {folders.map(folder => {
                   const Icon = iconMap[folder.icon] || FolderIcon;
                   return (
                        <li 
                            key={folder.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, folder.id)}
                            className="relative group folder-menu-container"
                        >
                            <Link 
                                to={`/dashboard/folder/${folder.id}`} 
                                className={`flex items-center justify-between p-2 rounded-lg transition-colors pr-8 ${folderId === folder.id ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <Icon className="h-4 w-4 flex-shrink-0"/>
                                    <span className="truncate text-sm">{folder.name}</span>
                                </div>
                            </Link>
                            
                            {/* Menu Button */}
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === folder.id ? null : folder.id);
                                }}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-300 dark:bg-slate-600 transition-opacity ${activeMenuId === folder.id ? 'opacity-100 bg-slate-300 dark:bg-slate-600' : 'opacity-0 group-hover:opacity-100'}`}
                            >
                                <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuId === folder.id && (
                                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-50 overflow-hidden animate-fade-in-up">
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleOpenEditModal(folder);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                        <Edit className="h-3 w-3" />
                                        {t('layout.edit')}
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleOpenDeleteModal(folder);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        {t('layout.delete')}
                                    </button>
                                </div>
                            )}
                        </li>
                   );
                })}
             </ul>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex flex-col gap-1">
             {/* Sidebar Events Widget */}
             <SidebarEventsWidget />
             
             {/* Settings Link */}
            <Link to="/settings" className={`flex items-center space-x-3 p-3 mt-1 rounded-lg transition-colors ${location.pathname === '/settings' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}>
                <Settings className="h-5 w-5" />
                <span>{t('layout.settings')}</span>
            </Link>
          </div>
        </nav>
        <main className="flex-1 overflow-y-auto relative">
            <div className="absolute top-4 right-8 z-50 flex items-center gap-2">
                 <HeaderThemeToggle />
                 <LanguageSelector />
            </div>
            {children}
        </main>
        <FolderModal 
            isOpen={isFolderModalOpen} 
            onClose={() => setIsFolderModalOpen(false)} 
            folderToEdit={folderToEdit} 
        />
        <DeleteFolderModal 
            isOpen={!!folderToDelete} 
            onClose={() => setFolderToDelete(null)} 
            folder={folderToDelete} 
        />
      </div>
    );
};

export default App;
