
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDocuments, DocumentSession, useLanguage, QuizQuestion, QuizAttempt } from '../App';
import { Upload, Loader2, FileText, Swords, AlertCircle, CheckCircle, XCircle, ChevronDown, Trash2, History, RotateCcw, PlayCircle, Plus, Landmark, Scale, Book, Shield, Settings2, X, AlertTriangle, ChevronLeft } from 'lucide-react';

// Helper for API KEY
const getApiKey = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
  // @ts-ignore
  return process.env.API_KEY || '';
};

// --- DATA CONSTANTS ---
const AVAILABLE_DOMAINS = [
    { id: 'Constitution of India', name: 'Constitution of India', icon: Landmark, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'Indian Penal Code (IPC)', name: 'Indian Penal Code (IPC)', icon: Scale, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
];

const CONSTITUTION_PARTS = [
    "Part I — The Union and its Territory",
    "Part II — Citizenship",
    "Part III — Fundamental Rights",
    "Part IV — Directive Principles of State Policy",
    "Part IVA — Fundamental Duties",
    "Part V — The Union",
    "Part VI — The States",
    "Part VII — Omitted",
    "Part VIII — The Union Territories",
    "Part IX — The Panchayats",
    "Part IXA — The Municipalities",
    "Part IXB — The Co-operative Societies",
    "Part X — The Scheduled and Tribal Areas",
    "Part XI — Relations Between the Union and the States",
    "Part XII — Finance, Property, Contracts and Suits",
    "Part XIII — Trade, Commerce and Intercourse within the Territory of India",
    "Part XIV — Services Under the Union and the States",
    "Part XIVA — Tribunals",
    "Part XV — Elections",
    "Part XVI — Special Provisions relating to Certain Classes",
    "Part XVII — Official Language",
    "Part XVIII — Emergency Provisions",
    "Part XIX — Miscellaneous",
    "Part XX — Amendment of the Constitution",
    "Part XXI — Temporary, Transitional and Special Provisions",
    "Part XXII — Short Title, Commencement, Authoritative Text in Hindi and Repeals"
];

const IPC_CHAPTERS = [
    "Chapter 1: Introduction – Preamble",
    "Chapter 2: General Explanations",
    "Chapter 3: Of Punishments",
    "Chapter 4: General Exceptions",
    "Chapter 5: Of Abetment",
    "Chapter 5A: Criminal Conspiracy",
    "Chapter 6: Of Offences Against the State",
    "Chapter 7: Of Offences Relating to the Army, Navy and Air Force",
    "Chapter 8: Of Offences Against the Public Tranquillity",
    "Chapter 9: Of Offences by or Relating to Public Servants",
    "Chapter 9A: Of Offences Relating to Elections",
    "Chapter 10: Of Contempts of the Lawful Authority of Public Servants",
    "Chapter 11: Of False Evidence and Offences Against Public Justice",
    "Chapter 12: Of Offences Relating to Coin and Government Stamps",
    "Chapter 13: Of Offences Relating to Weights and Measures",
    "Chapter 14: Of Offences Affecting the Public Health, Safety, Convenience, Decency and Morals",
    "Chapter 15: Of Offences Relating to Religion",
    "Chapter 16: Of Offences Affecting the Human Body",
    "Chapter 17: Of Offences Against Property",
    "Chapter 18: Of Offences Relating to Documents and to Property Marks",
    "Chapter 19: Of the Criminal Breach of Contracts of Service",
    "Chapter 20: Of Offences Relating to Marriage",
    "Chapter 20A: Of Cruelty by Husband or Relatives of Husband",
    "Chapter 21: Of Defamation",
    "Chapter 22: Of Criminal Intimidation, Insult and Annoyance",
    "Chapter 23: Of Attempts to Commit Offences"
];

// Types
type QuizState = 'selection' | 'generating' | 'active' | 'results';
type ExtendedQuizAttempt = QuizAttempt & { documentId?: string; documentName: string; isDomainQuiz: boolean };

const QuizHistoryCard: React.FC<{ attempt: ExtendedQuizAttempt; onDelete: () => void; onClick: () => void; isActive: boolean; }> = ({ attempt, onDelete, onClick, isActive }) => {
    const { t } = useLanguage();
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const handleDeleteRequest = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsConfirmingDelete(true);
    };

    const handleConfirmDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsConfirmingDelete(false);
    };

    if (isConfirmingDelete) {
        return (
            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 flex flex-col items-center text-center mb-3 animate-fade-in-up">
                <p className="font-semibold text-red-600 dark:text-red-400 text-sm mb-2">{t('quiz.deleteQuizConfirmTitle')}</p>
                <div className="flex gap-2">
                    <button onClick={handleConfirmDelete} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">{t('quiz.deleteButton')}</button>
                    <button onClick={handleCancelDelete} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs hover:bg-slate-300">{t('dashboard.cancel')}</button>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            className={`p-4 rounded-lg border transition-all cursor-pointer group relative mb-3 ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{attempt.documentName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(attempt.date).toLocaleDateString()} • {attempt.questions.length} Questions
                    </p>
                </div>
                {attempt.status === 'completed' ? (
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                        (attempt.score! / attempt.totalQuestions) >= 0.7 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                        {Math.round((attempt.score! / attempt.totalQuestions) * 100)}%
                    </div>
                ) : (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">{t('quiz.unattempted')}</span>
                )}
            </div>
            <button 
                onClick={handleDeleteRequest}
                className="absolute top-2 right-2 p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 className="h-3 w-3" />
            </button>
        </div>
    );
};

const QuizPage: React.FC = () => {
    const { sessions, saveQuizResult, deleteQuizAttempt, startQuizGeneration, domainQuizzes, startDomainQuizGeneration, saveDomainQuizResult, deleteDomainQuizAttempt } = useDocuments();
    const { t } = useLanguage();
    
    // State
    const [activeTab, setActiveTab] = useState<'documents' | 'domains'>('documents');
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<number[]>([]);
    const [showResults, setShowResults] = useState(false);
    
    // Domain Quiz Settings
    const [selectedSubTopics, setSelectedSubTopics] = useState<string[]>([]);
    const [quizType, setQuizType] = useState<'theory' | 'scenario' | 'mixed'>('mixed');
    
    // Derived Data
    const selectedDocument = useMemo(() => sessions.find(s => s.id === selectedSourceId), [sessions, selectedSourceId]);
    const selectedDomain = useMemo(() => AVAILABLE_DOMAINS.find(d => d.id === selectedSourceId), [selectedSourceId]);
    
    const quizHistory = useMemo(() => {
        if (selectedDocument) {
            return (selectedDocument.quizHistory || []).map(q => ({ ...q, documentId: selectedDocument.id, documentName: selectedDocument.fileName, isDomainQuiz: false }));
        }
        if (selectedDomain) {
            return (domainQuizzes[selectedDomain.id] || []).map(q => ({ ...q, documentName: selectedDomain.name, isDomainQuiz: true }));
        }
        return [];
    }, [selectedDocument, selectedDomain, domainQuizzes]);

    const activeQuiz = useMemo(() => {
        if (!activeQuizId) return null;
        return quizHistory.find(q => q.id === activeQuizId);
    }, [activeQuizId, quizHistory]);

    // Handlers
    const handleGenerate = async () => {
        if (selectedDocument) {
            const quizId = await startQuizGeneration(selectedDocument.id);
            if (quizId) setActiveQuizId(quizId);
        } else if (selectedDomain) {
            const quizId = await startDomainQuizGeneration(selectedDomain.id, { subTopics: selectedSubTopics, type: quizType });
            if (quizId) setActiveQuizId(quizId);
        }
    };

    const handleStartQuiz = (quiz: QuizAttempt) => {
        setActiveQuizId(quiz.id);
        setCurrentQuestionIndex(0);
        setUserAnswers(new Array(quiz.questions.length).fill(-1));
        setShowResults(quiz.status === 'completed');
        if (quiz.status === 'completed' && quiz.userAnswers) {
            setUserAnswers(quiz.userAnswers);
        }
    };

    const handleAnswerSelect = (optionIndex: number) => {
        if (showResults) return;
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };

    const handleFinish = () => {
        if (!activeQuiz || !selectedSourceId) return;
        
        let score = 0;
        activeQuiz.questions.forEach((q, idx) => {
            if (userAnswers[idx] === q.correctAnswerIndex) score++;
        });
        
        if (activeQuiz.isDomainQuiz) {
             saveDomainQuizResult(selectedSourceId, activeQuiz.id, score, userAnswers);
        } else {
             saveQuizResult(selectedSourceId, activeQuiz.id, score, userAnswers);
        }
        setShowResults(true);
    };

    const handleDeleteAttempt = (attempt: ExtendedQuizAttempt) => {
        if (attempt.isDomainQuiz) {
            deleteDomainQuizAttempt(selectedSourceId!, attempt.id);
        } else {
            deleteQuizAttempt(attempt.documentId!, attempt.id);
        }
        if (activeQuizId === attempt.id) {
            setActiveQuizId(null);
            setShowResults(false);
        }
    };

    // --- RENDER HELPERS ---
    
    // 1. Source Selection View
    const renderSourceSelection = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {activeTab === 'documents' ? (
                sessions.length > 0 ? sessions.map(doc => (
                    <div 
                        key={doc.id}
                        onClick={() => { setSelectedSourceId(doc.id); setActiveQuizId(null); }}
                        className={`bg-white dark:bg-slate-800 p-6 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg group relative ${selectedSourceId === doc.id ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
                    >
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full w-fit mb-4 group-hover:scale-110 transition-transform">
                            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 truncate" title={doc.fileName}>{doc.fileName}</h3>
                        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                             <span>{(doc.quizHistory || []).length} Quizzes</span>
                             {doc.status !== 'completed' && <span className="text-amber-500 text-xs font-bold flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Analyzing</span>}
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full text-center py-12 text-slate-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No documents uploaded yet. Go to Dashboard to upload.</p>
                    </div>
                )
            ) : (
                AVAILABLE_DOMAINS.map(domain => {
                    const Icon = domain.icon;
                    const count = (domainQuizzes[domain.id] || []).length;
                    return (
                        <div 
                            key={domain.id}
                            onClick={() => { setSelectedSourceId(domain.id); setActiveQuizId(null); }}
                            className={`bg-white dark:bg-slate-800 p-6 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg group relative ${selectedSourceId === domain.id ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
                        >
                            <div className={`${domain.bg} p-3 rounded-full w-fit mb-4 group-hover:scale-110 transition-transform`}>
                                <Icon className={`h-6 w-6 ${domain.color}`} />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{domain.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{count} Quizzes Taken</p>
                        </div>
                    );
                })
            )}
        </div>
    );

    // 2. Quiz Configuration / History Panel (Left Sidebar when selected)
    const renderQuizPanel = () => {
        if (!selectedSourceId) return null;
        
        const isGenerating = selectedDocument?.quizGenerationStatus === 'generating' || 
                             (selectedDomain && domainQuizzes[selectedDomain.id]?.some(q => q.status === 'generating'));

        return (
            <div className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full animate-slide-in-right">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button onClick={() => { setSelectedSourceId(null); setActiveQuizId(null); }} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white mb-4 transition-colors">
                        <ChevronLeft className="h-4 w-4" /> Back to Selection
                    </button>
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-1">
                        {selectedDocument ? selectedDocument.fileName : selectedDomain?.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedDocument ? 'Document Quiz' : 'Legal Domain Quiz'}
                    </p>
                </div>

                <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4">
                    {/* Domain Specific Options */}
                    {selectedDomain && (
                        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                             <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                 <Settings2 className="h-4 w-4" /> Quiz Settings
                             </div>
                             
                             <div>
                                 <label className="text-xs text-slate-500 uppercase font-bold">Type</label>
                                 <div className="flex mt-1 bg-white dark:bg-slate-800 rounded p-1 border border-slate-200 dark:border-slate-600">
                                     {['theory', 'scenario', 'mixed'].map(t => (
                                         <button 
                                            key={t}
                                            onClick={() => setQuizType(t as any)}
                                            className={`flex-1 text-xs py-1 rounded capitalize ${quizType === t ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                         >
                                             {t}
                                         </button>
                                     ))}
                                 </div>
                             </div>

                             <div>
                                 <label className="text-xs text-slate-500 uppercase font-bold">Focus Topic (Optional)</label>
                                 <select 
                                    className="w-full mt-1 text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                                    onChange={(e) => setSelectedSubTopics(e.target.value ? [e.target.value] : [])}
                                    value={selectedSubTopics[0] || ''}
                                 >
                                     <option value="">General (All Topics)</option>
                                     {selectedDomain.id.includes('Constitution') ? CONSTITUTION_PARTS.map(p => (
                                         <option key={p} value={p}>{p}</option>
                                     )) : IPC_CHAPTERS.map(c => (
                                         <option key={c} value={c}>{c}</option>
                                     ))}
                                 </select>
                             </div>
                        </div>
                    )}

                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || (selectedDocument && selectedDocument.status !== 'completed')}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                        {t('quiz.generateNew')}
                    </button>
                    {selectedDocument && selectedDocument.status !== 'completed' && (
                        <p className="text-xs text-amber-500 text-center flex items-center justify-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Document analysis must complete first.
                        </p>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto p-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <History className="h-3 w-3" /> {t('quiz.historyTitle')}
                    </h3>
                    {quizHistory.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm italic">
                            {t('quiz.noHistory')}
                        </div>
                    ) : (
                        quizHistory.map(attempt => (
                            <QuizHistoryCard 
                                key={attempt.id} 
                                attempt={attempt} 
                                onDelete={() => handleDeleteAttempt(attempt)}
                                onClick={() => handleStartQuiz(attempt)}
                                isActive={activeQuizId === attempt.id}
                            />
                        ))
                    )}
                </div>
            </div>
        );
    };

    // 3. Quiz Player / Results View
    const renderActiveQuiz = () => {
        if (!activeQuiz) {
             if (selectedSourceId) {
                 return (
                     <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                         <Swords className="h-16 w-16 mb-4 opacity-20" />
                         <p className="text-lg font-medium">{t('quiz.selectPrompt')}</p>
                     </div>
                 );
             }
             return null;
        }

        if (activeQuiz.status === 'generating') {
             return (
                 <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in-up">
                     <Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-6" />
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('quiz.generatingTitle')}</h2>
                     <p className="text-slate-500 dark:text-slate-400 max-w-md text-center">{t('quiz.generatingSubtitle')}</p>
                 </div>
             );
        }

        if (activeQuiz.status === 'error') {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('quiz.errorTitle')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">{t('quiz.errorSubtitle')}</p>
                    <button onClick={() => handleDeleteAttempt(activeQuiz)} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                        Dismiss
                    </button>
                </div>
            );
        }

        const currentQuestion = activeQuiz.questions[currentQuestionIndex];
        const isLastQuestion = currentQuestionIndex === activeQuiz.questions.length - 1;
        const score = userAnswers.filter((ans, i) => ans === activeQuiz.questions[i].correctAnswerIndex).length;

        if (showResults) {
            return (
                <div className="flex-1 overflow-y-auto p-8 animate-fade-in-up">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-8">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 text-center border-b border-slate-200 dark:border-slate-700">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('quiz.resultsTitle')}</h2>
                                <div className="text-5xl font-black text-blue-600 dark:text-blue-400 my-4">{Math.round((score / activeQuiz.questions.length) * 100)}%</div>
                                <p className="text-slate-500 dark:text-slate-400">
                                    {t('quiz.resultsScore', { score, total: activeQuiz.questions.length })}
                                </p>
                                <button 
                                    onClick={() => { handleStartQuiz(activeQuiz); setShowResults(false); setUserAnswers(new Array(activeQuiz.questions.length).fill(-1)); }}
                                    className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-colors flex items-center gap-2 mx-auto"
                                >
                                    <RotateCcw className="h-4 w-4" /> {t('quiz.retake')}
                                </button>
                            </div>
                            
                            <div className="p-8 space-y-8">
                                {activeQuiz.questions.map((q, idx) => {
                                    const isCorrect = userAnswers[idx] === q.correctAnswerIndex;
                                    return (
                                        <div key={idx} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/30' : 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30'}`}>
                                            <div className="flex gap-3">
                                                <div className={`mt-1 flex-shrink-0`}>
                                                    {isCorrect ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">{idx + 1}. {q.question}</p>
                                                    <div className="space-y-1 text-sm mb-3">
                                                        <p className={`${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                                            <span className="font-bold">{t('quiz.yourAnswer')}</span> {q.options[userAnswers[idx]] || 'Skipped'}
                                                        </p>
                                                        {!isCorrect && (
                                                            <p className="text-green-700 dark:text-green-400">
                                                                <span className="font-bold">{t('quiz.correctAnswer')}</span> {q.options[q.correctAnswerIndex]}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 p-3 rounded text-sm text-slate-600 dark:text-slate-400 italic border border-slate-100 dark:border-slate-700">
                                                        <span className="font-bold not-italic mr-1">{t('quiz.explanation')}</span> {q.explanation}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Active Quiz Player
        return (
            <div className="flex-1 overflow-y-auto p-8 flex flex-col animate-fade-in-up">
                 <div className="max-w-3xl mx-auto w-full flex-grow flex flex-col">
                     {/* Progress Bar */}
                     <div className="mb-8">
                         <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                             <span>Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</span>
                             <span>{Math.round(((currentQuestionIndex) / activeQuiz.questions.length) * 100)}% Completed</span>
                         </div>
                         <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((currentQuestionIndex) / activeQuiz.questions.length) * 100}%` }}></div>
                         </div>
                     </div>

                     {/* Question Card */}
                     <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex-grow flex flex-col">
                         <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold uppercase rounded-full w-fit mb-4">
                             {currentQuestion.type} Question
                         </span>
                         <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 leading-snug">
                             {currentQuestion.question}
                         </h2>
                         
                         <div className="space-y-3 mb-8">
                             {currentQuestion.options.map((option, idx) => (
                                 <button
                                     key={idx}
                                     onClick={() => handleAnswerSelect(idx)}
                                     className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                                         userAnswers[currentQuestionIndex] === idx 
                                         ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                                         : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                     }`}
                                 >
                                     <span className={`font-medium ${userAnswers[currentQuestionIndex] === idx ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{option}</span>
                                     <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                         userAnswers[currentQuestionIndex] === idx ? 'border-blue-500 bg-blue-500' : 'border-slate-300 dark:border-slate-600'
                                     }`}>
                                         {userAnswers[currentQuestionIndex] === idx && <div className="h-2 w-2 bg-white rounded-full"></div>}
                                     </div>
                                 </button>
                             ))}
                         </div>

                         <div className="mt-auto flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-700">
                             <button 
                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium disabled:opacity-30 transition-colors"
                             >
                                 Previous
                             </button>
                             <button 
                                onClick={() => isLastQuestion ? handleFinish() : setCurrentQuestionIndex(currentQuestionIndex + 1)}
                                disabled={userAnswers[currentQuestionIndex] === -1}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                             </button>
                         </div>
                     </div>
                 </div>
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh)] bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Left Panel: Sidebar or Main List */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${selectedSourceId ? 'hidden lg:flex lg:w-80 lg:flex-none lg:border-r dark:border-slate-700' : 'w-full'}`}>
                 {selectedSourceId ? renderQuizPanel() : (
                     <div className="flex-1 overflow-y-auto p-8">
                         <header className="mb-8 max-w-5xl mx-auto">
                            <h1 className="text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <Swords className="h-10 w-10 text-indigo-500" />
                                {t('quiz.title')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">{t('quiz.subtitle')}</p>
                         </header>

                         <div className="max-w-5xl mx-auto mb-8">
                             <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-lg w-fit">
                                 <button 
                                    onClick={() => setActiveTab('documents')}
                                    className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'documents' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                 >
                                     Your Documents
                                 </button>
                                 <button 
                                    onClick={() => setActiveTab('domains')}
                                    className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'domains' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                 >
                                     Legal Domains
                                 </button>
                             </div>
                         </div>

                         <div className="max-w-5xl mx-auto pb-12">
                             {renderSourceSelection()}
                         </div>
                     </div>
                 )}
            </div>

            {/* Right Panel: Active Quiz Area (only visible when source selected) */}
            {selectedSourceId && (
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                    {renderActiveQuiz()}
                </div>
            )}
        </div>
    );
};

export default QuizPage;
