
import React, { useState, useMemo, useEffect } from 'react';
import { useDocuments, DocumentSession, useTools, ComparisonHistoryItem } from '../App';
import { Upload, FileDiff, ArrowRightLeft, X, Loader2, AlertCircle, FileText, CheckCircle, AlertTriangle, Info, Trash2, History, Plus } from 'lucide-react';

const ComparePage: React.FC = () => {
  const { sessions, addSession } = useDocuments();
  const { compareHistory, compareDocuments, deleteComparison } = useTools();
  const [docA, setDocA] = useState<DocumentSession | null>(null);
  const [docB, setDocB] = useState<DocumentSession | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentComparisonId, setCurrentComparisonId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [justStartedComparison, setJustStartedComparison] = useState(false);

  const sessionsSorted = useMemo(() => [...sessions].sort((a, b) => b.createdAt - a.createdAt), [sessions]);
  
  const currentComparison = compareHistory.find(c => c.id === currentComparisonId);
  const isComparing = currentComparison?.status === 'processing';
  const comparisonResult = currentComparison?.result;

  const handleDrop = (e: React.DragEvent, slot: 'A' | 'B') => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData('sessionId');
    if (sessionId) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        if (slot === 'A') setDocA(session);
        else setDocB(session);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        await addSession(file);
      } catch (err) {
        console.error("Upload failed", err);
        setError("Failed to upload document. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleCompare = () => {
    if (!docA || !docB) return;
    setError(null);
    compareDocuments(docA, docB);
    setJustStartedComparison(true);
  };
  
  // Effect to select newly created comparison ONLY when explicitly started by user
  useEffect(() => {
      if (justStartedComparison && compareHistory.length > 0) {
          // The new comparison is inserted at the beginning
          setCurrentComparisonId(compareHistory[0].id);
          setJustStartedComparison(false);
      }
  }, [compareHistory, justStartedComparison]);


  const handleReset = () => {
    setDocA(null);
    setDocB(null);
    setCurrentComparisonId(null);
    setError(null);
  };

  const loadHistoryItem = (item: ComparisonHistoryItem) => {
      setCurrentComparisonId(item.id);
  };
  
  const handleDeleteComparison = (id: string) => {
      deleteComparison(id);
      if (currentComparisonId === id) setCurrentComparisonId(null);
      setDeleteConfirmId(null);
  }

  const renderDocCard = (doc: DocumentSession, onRemove: () => void, label: string) => (
    <div className="h-full flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800 rounded-xl border-2 border-blue-500/20 p-6 shadow-sm relative group animate-fade-in-up">
        <button onClick={onRemove} className="absolute top-2 right-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors">
            <X className="h-4 w-4" />
        </button>
        
        <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mb-4">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        
        <span className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">{label}</span>
        <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate w-full px-2" title={doc.fileName}>{doc.fileName}</h3>
        
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-4">
            {new Date(doc.createdAt).toLocaleDateString()}
        </div>
    </div>
  );

  const renderEmptySlot = (slot: 'A' | 'B') => (
    <div 
        className="h-full min-h-[200px] bg-white dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center p-6 transition-all cursor-pointer glow-border card-hover-glow"
        onDrop={(e) => handleDrop(e, slot)}
        onDragOver={handleDragOver}
    >
        <Upload className="h-10 w-10 text-slate-400 mb-4" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            {slot === 'A' ? "Upload Doc 1" : "Upload Doc 2"}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
            Drag & drop from list below or click to upload
        </p>
        <label className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer shadow-sm">
            Select File
            <input type="file" className="hidden" onChange={(e) => handleUpload(e, slot)} disabled={isUploading} />
        </label>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh)]">
        <main className="flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
            <header className="mb-8 animate-fade-in-up">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <FileDiff className="h-9 w-9 text-indigo-500" />
                    Compare Legal Documents
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
                    Upload two versions of a document to instantly spot changes, risks, and new clauses.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm">
                    <Info className="h-4 w-4" />
                    <span><strong>Pro Tip:</strong> Great for checking "Terms & Conditions" updates or comparing lease renewals.</span>
                </div>
            </header>

            {error && (
                <div className="bg-red-500/10 text-red-500 dark:text-red-400 p-4 rounded-lg mb-6 flex items-center gap-3 animate-fade-in-up">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {!currentComparisonId && (
                <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 mb-8 items-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    {/* Slot A */}
                    <div className="lg:col-span-5 h-64">
                        {docA ? renderDocCard(docA, () => setDocA(null), "Reference (Doc A)") : renderEmptySlot('A')}
                    </div>

                    {/* VS Badge */}
                    <div className="lg:col-span-1 flex justify-center">
                        <div className="bg-slate-200 dark:bg-slate-700 rounded-full p-3 border-4 border-white dark:border-slate-900 shadow-lg z-10">
                            <ArrowRightLeft className="h-6 w-6 text-slate-500 dark:text-slate-300" />
                        </div>
                    </div>

                    {/* Slot B */}
                    <div className="lg:col-span-5 h-64">
                        {docB ? renderDocCard(docB, () => setDocB(null), "Comparison (Doc B)") : renderEmptySlot('B')}
                    </div>
                </div>
            )}

            {!currentComparisonId && (
                <div className="flex justify-center mb-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <button 
                        onClick={handleCompare}
                        disabled={!docA || !docB}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                        <FileDiff className="h-6 w-6" /> Compare Documents
                    </button>
                </div>
            )}
            
            {/* Active or Completed Comparison View */}
            {currentComparisonId && (
                <div className="space-y-6 animate-fade-in-up mb-12">
                     <button onClick={handleReset} className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-4">
                        <ArrowRightLeft className="h-4 w-4" /> Start New Comparison
                     </button>
                    
                    {currentComparison?.status === 'processing' && (
                        <div className="bg-white dark:bg-slate-800 p-12 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                            <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Analyzing differences...</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">This usually takes about 30-60 seconds.</p>
                        </div>
                    )}
                    
                    {currentComparison?.status === 'error' && (
                        <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-xl border border-red-200 dark:border-red-800 text-center">
                             <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                             <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Comparison Failed</h3>
                             <p className="text-red-600 dark:text-red-300 mt-1">Please ensure the documents are valid and readable.</p>
                             <button onClick={handleReset} className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition-colors">Try Again</button>
                        </div>
                    )}

                    {currentComparison?.status === 'completed' && comparisonResult && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Comparison Analysis</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{currentComparison.docAName} vs {currentComparison.docBName}</p>
                                </div>
                                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase">Completed</span>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg mb-6">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{comparisonResult.summary}</p>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Key Differences</h3>
                            <div className="space-y-4">
                                {comparisonResult.differences.map((diff, idx) => (
                                    <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                    diff.type === 'Added' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    diff.type === 'Removed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>{diff.type}</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{diff.category}</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full ${
                                                diff.impact === 'Critical' ? 'bg-red-500 text-white' :
                                                diff.impact === 'High' ? 'bg-orange-500 text-white' :
                                                diff.impact === 'Medium' ? 'bg-yellow-500 text-white' :
                                                'bg-slate-500 text-white'
                                            }`}>
                                                {diff.impact === 'Critical' && <AlertTriangle className="h-3 w-3" />}
                                                {diff.impact} Impact
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white dark:bg-slate-800">
                                            <p className="text-slate-700 dark:text-slate-300 mb-3">{diff.description}</p>
                                            
                                            {(diff.originalClause || diff.newClause) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                    {diff.originalClause && (
                                                        <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded">
                                                            <p className="text-xs font-bold text-red-500 mb-1 uppercase">Original (Doc A)</p>
                                                            <p className="text-slate-600 dark:text-slate-400 font-mono text-xs">{diff.originalClause}</p>
                                                        </div>
                                                    )}
                                                    {diff.newClause && (
                                                        <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded">
                                                            <p className="text-xs font-bold text-green-500 mb-1 uppercase">New (Doc B)</p>
                                                            <p className="text-slate-600 dark:text-slate-400 font-mono text-xs">{diff.newClause}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-lg flex gap-4">
                                <CheckCircle className="h-6 w-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">Conclusion</h4>
                                    <p className="text-indigo-800 dark:text-indigo-200 text-sm">{comparisonResult.conclusion}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!currentComparisonId && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Available Documents</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sessionsSorted.map(session => {
                             const isProcessing = session.status === 'processing';
                             const isError = session.status === 'error';
                             const isSelected = (docA?.id === session.id || docB?.id === session.id);
                             const isDisabled = isError;

                             return (
                                <div 
                                    key={session.id} 
                                    draggable={!isDisabled}
                                    onDragStart={(e) => {
                                        if (isDisabled) {
                                            e.preventDefault();
                                            return;
                                        }
                                        e.dataTransfer.setData('sessionId', session.id)
                                    }}
                                    onClick={() => {
                                        if (isDisabled) return;
                                        if (!docA) setDocA(session);
                                        else if (!docB && docA.id !== session.id) setDocB(session);
                                    }}
                                    className={`bg-white dark:bg-slate-800 p-3 rounded-lg border transition-all 
                                        ${!isDisabled ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-not-allowed opacity-80'}
                                        ${isSelected 
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 opacity-50 cursor-default' 
                                            : isError 
                                                ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}
                                    `}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className={`h-4 w-4 ${isError ? 'text-red-400' : 'text-slate-500'}`} />
                                            <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{session.fileName}</span>
                                        </div>
                                        {isProcessing && <Loader2 className="h-4 w-4 text-amber-500 animate-spin flex-shrink-0" />}
                                        {isError && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                    </div>
                                    <p className={`text-xs ${isError ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                                        {isProcessing ? 'Analyzing...' : isError ? 'Analysis failed' : new Date(session.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                             );
                        })}
                        {sessionsSorted.length === 0 && (
                            <div className="col-span-full text-center py-8 text-slate-400">
                                No documents found. Upload some above!
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>

        {/* Right Sidebar - History */}
        <aside className="w-80 bg-white/80 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700 flex flex-col p-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 mt-12 flex items-center gap-2">
                <History className="h-5 w-5" /> History
            </h2>
            
            <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                {compareHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        <p>No comparison history yet.</p>
                    </div>
                ) : (
                    compareHistory.map(item => (
                        <div key={item.id} className={`bg-white dark:bg-slate-800 border rounded-lg overflow-hidden group hover:shadow-md transition-all ${currentComparisonId === item.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700'}`}>
                            <button 
                                onClick={() => loadHistoryItem(item)}
                                className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-indigo-500">Comparison</span>
                                    {item.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
                                    {item.status === 'completed' && <span className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString()}</span>}
                                    {item.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                </div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    <span className="truncate max-w-[40%]">{item.docAName}</span>
                                    <span className="text-slate-400 shrink-0">vs</span>
                                    <span className="truncate max-w-[40%]">{item.docBName}</span>
                                </div>
                            </button>
                            <div className={`bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/20 p-2 flex justify-between items-center transition-all ${deleteConfirmId === item.id ? 'block' : 'hidden'}`}>
                                <span className="text-xs text-red-600 dark:text-red-400">Delete this?</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                                    <button onClick={() => handleDeleteComparison(item.id)} className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400">Delete</button>
                                </div>
                            </div>
                            {deleteConfirmId !== item.id && (
                                <div className="border-t border-slate-100 dark:border-slate-700 p-1 flex justify-end bg-slate-50 dark:bg-slate-800/50">
                                     <button 
                                        onClick={() => setDeleteConfirmId(item.id)}
                                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                     >
                                         <Trash2 className="h-3 w-3" />
                                     </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Start New Comparison Button in Sidebar - Visible only if there is history */}
            {compareHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Start New Comparison</span>
                    </button>
                </div>
            )}
        </aside>
    </div>
  );
};

export default ComparePage;
