import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { Bot, FileSignature, Sparkles, Download, AlertTriangle, Loader2, CheckCircle, Plus, Trash2, Gavel, Sparkles as SparklesIcon, History, X, Scale, Send, Shield, Building2, User as UserIcon, Lock } from 'lucide-react';
import { useLanguage, useTools, GeneratedDoc } from '../App';

// --- LAWYER MODAL COMPONENT ---
const LawyerModal: React.FC<{ 
    doc: GeneratedDoc; 
    onClose: () => void; 
    onConfirm: (docId: string, domain: string, message: string, estimatedFee: number) => void; 
}> = ({ doc, onClose, onConfirm }) => {
    const { t } = useLanguage();
    const [step, setStep] = useState<1 | 2>(1);
    const [domain, setDomain] = useState('');
    const [message, setMessage] = useState('');
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimatedFee, setEstimatedFee] = useState<number | null>(null);

    // Hardcoded domains for the prototype
    const domains = ['Criminal', 'Civil', 'Corporate', 'Property', 'Family', 'IPR'];

    const handleEstimate = () => {
        if (!domain || !message) return;
        setIsEstimating(true);
        // Simulate AI estimation delay
        setTimeout(() => {
            setEstimatedFee(Math.floor(Math.random() * 5000) + 1500); // Random fee 1500-6500
            setIsEstimating(false);
            setStep(2);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <Gavel className="h-5 w-5 text-indigo-600" />
                        {doc.lawyerRequest ? t('docGenerator.lawyer.reviewTitle') : t('docGenerator.lawyer.connectTitle')}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {doc.lawyerRequest ? (
                        // READ ONLY VIEW (If already submitted)
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-200">{t('docGenerator.lawyer.reviewDesc')}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Domain</label>
                                <p className="font-medium text-slate-900 dark:text-white">{doc.lawyerRequest.domain}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Message</label>
                                <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded mt-1">{doc.lawyerRequest.message}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Estimated Fee</label>
                                <p className="text-lg font-bold text-green-600">₹{doc.lawyerRequest.estimatedFee}</p>
                            </div>
                            <button disabled className="w-full py-2 bg-slate-100 text-slate-400 font-bold rounded cursor-not-allowed">
                                Request Submitted
                            </button>
                        </div>
                    ) : (
                        // REQUEST FORM
                        <div className="space-y-5">
                            {!estimatedFee ? (
                                <>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{t('docGenerator.lawyer.connectDesc')}</p>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Legal Domain</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {domains.map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setDomain(d)}
                                                    className={`px-3 py-2 text-sm rounded-lg border text-left transition-all ${
                                                        domain === d 
                                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300' 
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                    }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message to Lawyer</label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder={t('docGenerator.lawyer.describePlaceholder')}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                                        />
                                    </div>

                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded border border-amber-100 dark:border-amber-800 flex gap-2">
                                        <Lock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-700 dark:text-amber-400">{t('docGenerator.lawyer.lockWarning')}</p>
                                    </div>

                                    <button
                                        onClick={handleEstimate}
                                        disabled={!domain || !message || isEstimating}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isEstimating ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                {t('docGenerator.lawyer.estimating')}
                                            </>
                                        ) : (
                                            <>
                                                <Scale className="h-5 w-5" />
                                                {t('docGenerator.lawyer.getEstimate')}
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                // CONFIRMATION STEP
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="text-center py-4">
                                        <div className="inline-flex items-center justify-center p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
                                            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white">Estimate Ready</h4>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Service:</span>
                                            <span className="font-medium">{domain} Consultation</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Document:</span>
                                            <span className="font-medium truncate max-w-[200px]">{doc.title}</span>
                                        </div>
                                        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{t('docGenerator.lawyer.estimatedFee')}</span>
                                            <span className="text-2xl font-bold text-indigo-600">₹{estimatedFee}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-center text-slate-400">{t('docGenerator.lawyer.estimateDisclaimer')}</p>

                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => { setEstimatedFee(null); setStep(1); }}
                                            className="flex-1 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button 
                                            onClick={() => onConfirm(doc.id, domain, message, estimatedFee)}
                                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
                                        >
                                            {t('docGenerator.lawyer.sendRequest')}
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const DocGeneratorPage: React.FC = () => {
    const { docGenHistory, generateDocument, redraftDocument, deleteGeneratedDoc, updateGeneratedDoc } = useTools();
    const { t } = useLanguage();
    
    // UI State
    const [prompt, setPrompt] = useState('');
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [redraftInstruction, setRedraftInstruction] = useState('');
    const [isRedrafting, setIsRedrafting] = useState(false);
    
    // Lawyer Modal State
    const [lawyerModal, setLawyerModal] = useState<{ isOpen: boolean; docId: string | null }>({ isOpen: false, docId: null });

    const selectedDoc = docGenHistory.find(d => d.id === selectedDocId);
    
    // Refs to track state changes without triggering re-renders
    const hasInitialized = useRef(false);
    const prevHistoryLength = useRef(docGenHistory.length);

    // FIX: Smart Selection Logic
    useEffect(() => {
        // 1. Initial Load: Auto-select the most recent document ONLY when the page first opens.
        if (!hasInitialized.current) {
            if (docGenHistory.length > 0) {
                setSelectedDocId(docGenHistory[0].id);
            }
            hasInitialized.current = true;
            return;
        }

        // 2. New Document Created: If the history grew (user clicked Generate), auto-select the new one.
        if (docGenHistory.length > prevHistoryLength.current) {
            if (docGenHistory.length > 0) {
                setSelectedDocId(docGenHistory[0].id);
            }
        }
        
        // Update ref for next render
        prevHistoryLength.current = docGenHistory.length;
    }, [docGenHistory]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setPrompt('');
        await generateDocument(prompt);
    };

    const handleRedraft = async () => {
        if (!selectedDoc || !redraftInstruction.trim()) return;
        setIsRedrafting(true);
        await redraftDocument(selectedDoc, redraftInstruction);
        setRedraftInstruction('');
        setIsRedrafting(false);
    };

    const handleDownload = (doc: GeneratedDoc) => {
        const element = document.createElement("a");
        const file = new Blob([doc.documentContent], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleOpenLawyerModal = (docId: string) => {
        setLawyerModal({ isOpen: true, docId });
    };

    const handleLawyerRequestConfirm = (docId: string, domain: string, message: string, estimatedFee: number) => {
        const doc = docGenHistory.find(d => d.id === docId);
        if (doc) {
            updateGeneratedDoc({
                ...doc,
                lawyerRequest: { domain, message, estimatedFee, status: 'submitted' }
            });
            setLawyerModal({ isOpen: false, docId: null });
        }
    };
    
    const handleDelete = (id: string) => {
        deleteGeneratedDoc(id);
        if (selectedDocId === id) setSelectedDocId(null);
    }

    return (
        <div className="flex h-[calc(100vh)] bg-slate-50 dark:bg-slate-900">
            {/* Sidebar List */}
            <aside className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-20 shadow-sm">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <button 
                        onClick={() => setSelectedDocId(null)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all transform hover:scale-[1.02]"
                    >
                        <Plus className="h-5 w-5" />
                        {t('docGenerator.startOverButton')}
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                     <h3 className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">{t('docGenerator.history')}</h3>
                     {docGenHistory.length === 0 ? (
                         <div className="text-center py-8 text-slate-400 text-sm italic">
                             <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                             No documents yet.
                         </div>
                     ) : (
                         docGenHistory.map(doc => (
                             <div 
                                key={doc.id}
                                onClick={() => setSelectedDocId(doc.id)}
                                className={`group relative p-3 rounded-lg cursor-pointer border transition-all hover:shadow-sm ${
                                    selectedDocId === doc.id 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                                    : 'bg-white dark:bg-slate-800 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                             >
                                 <div className="flex justify-between items-start mb-1">
                                     <h4 className={`font-semibold text-sm truncate pr-6 ${selectedDocId === doc.id ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{doc.title || t('docGenerator.untitled')}</h4>
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                                        title={t('layout.delete')}
                                     >
                                         <Trash2 className="h-4 w-4" />
                                     </button>
                                 </div>
                                 <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                                     <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                     {doc.status === 'generating' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                     {doc.lawyerRequest && <Gavel className="h-3 w-3 text-amber-500" />}
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {selectedDoc ? (
                    // VIEW MODE
                    <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in-up">
                        {/* Header */}
                        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                    <FileSignature className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-md">{selectedDoc.title}</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        {selectedDoc.status === 'completed' ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
                                        {selectedDoc.status === 'completed' ? 'Ready' : 'Drafting...'}
                                    </p>
                                </div>
                            </div>
                            <div></div> 
                        </header>

                        {/* Document View */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-black/20">
                            <div className="max-w-4xl mx-auto shadow-xl rounded-lg overflow-hidden animate-fade-in-up">
                                {/* Disclaimer Banner */}
                                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 text-amber-800 dark:text-amber-200 text-sm flex gap-3">
                                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                    <p>{t('docGenerator.disclaimer')}</p>
                                </div>
                                
                                {/* The Paper */}
                                <div className="bg-white text-slate-900 min-h-[800px] p-12 document-prose">
                                     {selectedDoc.status === 'generating' && !selectedDoc.documentContent ? (
                                         <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4">
                                             <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                             <p className="animate-pulse">Drafting your document...</p>
                                         </div>
                                     ) : (
                                         <div 
                                            className="generated-content"
                                            dangerouslySetInnerHTML={{ __html: marked.parse(selectedDoc.documentContent || '') as string }} 
                                         />
                                     )}
                                     {selectedDoc.status === 'generating' && selectedDoc.documentContent && (
                                         <div className="mt-4 flex items-center gap-2 text-slate-400 animate-pulse">
                                             <div className="h-2 w-2 bg-primary rounded-full"></div>
                                             Writing...
                                         </div>
                                     )}
                                </div>
                            </div>
                        </div>

                        {/* Redraft Bar */}
                        <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 z-20">
                            <div className="max-w-4xl mx-auto flex flex-col gap-3">
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => handleDownload(selectedDoc)}
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                                    >
                                        <Download className="h-4 w-4" />
                                        {t('docGenerator.downloadButton')}
                                    </button>
                                    <button 
                                        onClick={() => handleOpenLawyerModal(selectedDoc.id)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm ${
                                            selectedDoc.lawyerRequest 
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        }`}
                                    >
                                        <Gavel className="h-4 w-4" />
                                        {selectedDoc.lawyerRequest ? t('docGenerator.lawyer.reviewButton') : t('docGenerator.lawyer.consultButton')}
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        type="text"
                                        value={redraftInstruction}
                                        onChange={(e) => setRedraftInstruction(e.target.value)}
                                        placeholder={t('docGenerator.redraftPlaceholder')}
                                        disabled={isRedrafting || selectedDoc.status === 'generating'}
                                        className="w-full pl-4 pr-14 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-full focus:ring-2 focus:ring-primary outline-none shadow-inner"
                                        onKeyDown={(e) => e.key === 'Enter' && handleRedraft()}
                                    />
                                    <button
                                        onClick={handleRedraft}
                                        disabled={!redraftInstruction.trim() || isRedrafting || selectedDoc.status === 'generating'}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                    >
                                        {isRedrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // CREATE MODE
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
                        <div className="max-w-2xl w-full">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-6 rounded-full inline-block mb-8 shadow-sm">
                                <SparklesIcon className="h-12 w-12 text-primary" />
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('docGenerator.title')}</h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                {t('docGenerator.subtitle')}
                            </p>
                            
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg text-left mb-8 relative group hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                                <div className="absolute -top-3 -left-3 bg-white dark:bg-slate-700 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                                    <Bot className="h-5 w-5 text-primary" />
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 italic">
                                    "{t('docGenerator.aiPrompt')}"
                                </p>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={t('docGenerator.inputPlaceholder')}
                                    className="w-full p-4 pr-32 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary outline-none shadow-sm text-lg min-h-[120px] resize-none"
                                />
                                <div className="absolute bottom-3 right-3">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!prompt.trim()}
                                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                    >
                                        <Sparkles className="h-5 w-5" />
                                        {t('docGenerator.generateButton')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            
            {/* Modal */}
            {lawyerModal.isOpen && lawyerModal.docId && selectedDoc && (
                <LawyerModal 
                    doc={selectedDoc} 
                    onClose={() => setLawyerModal({ isOpen: false, docId: null })} 
                    onConfirm={handleLawyerRequestConfirm} 
                />
            )}
        </div>
    );
};

export default DocGeneratorPage;