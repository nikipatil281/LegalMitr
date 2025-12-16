

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useDocuments, DocumentSession, useAuth, useLanguage, SubscriptionTier } from '../App';
import { Upload, Files, TrendingUp, Bookmark, Clock, AlertTriangle, MoreVertical, Trash2, Loader2, CornerUpLeft, FolderOpen, Crown, Zap, Shield, Infinity as InfinityIcon, Coins } from 'lucide-react';

// New Compact Stat Tile (Fixed Types)
const CompactStatTile: React.FC<{ label: string; value: string | number; icon: any; color: string; }> = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 hover:-translate-y-1 transition-transform shadow-sm">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
    </div>
);

// New Plan Usage Card
const PlanUsageCard: React.FC<{ tier: SubscriptionTier; totalTokens: number }> = ({ tier, totalTokens }) => {
    let limit = 50000;
    let tierName = 'Free';
    let Icon = Shield;
    let colorClass = 'bg-slate-500';
    let textClass = 'text-slate-500';
    let bgClass = 'bg-slate-100 dark:bg-slate-700';

    if (tier === 'pro') {
        limit = Infinity;
        tierName = 'Pro';
        Icon = Crown;
        colorClass = 'bg-amber-500';
        textClass = 'text-amber-500';
        bgClass = 'bg-amber-50 dark:bg-amber-900/20';
    }

    const percentage = limit === Infinity ? 100 : Math.min((totalTokens / limit) * 100, 100);

    return (
        <div className={`rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between h-full relative overflow-hidden group ${bgClass}`}>
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Icon className="h-24 w-24 transform rotate-12" />
             </div>

             <div className="relative z-10">
                 <div className="flex justify-between items-start mb-4">
                     <div>
                         <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Plan Usage</p>
                         <h3 className={`text-2xl font-bold ${textClass} flex items-center gap-2`}>
                             {tierName} Plan
                             {tier === 'pro' && <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold uppercase">Active</span>}
                         </h3>
                     </div>
                     <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm ${textClass}`}>
                         <Icon className="h-6 w-6" />
                     </div>
                 </div>
                 
                 <div className="mb-2 flex justify-between items-end">
                     <span className="text-3xl font-bold text-slate-900 dark:text-white">
                        {tier === 'pro' ? 'Unlimited' : totalTokens.toLocaleString()}
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium ml-1">
                            {tier === 'pro' ? 'Tokens' : '/ ' + (limit / 1000) + 'k Tokens'}
                        </span>
                     </span>
                     {tier !== 'pro' && (
                         <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm">
                             {Math.round(percentage)}%
                         </span>
                     )}
                 </div>

                 {/* Progress Bar */}
                 <div className="w-full bg-white dark:bg-slate-800 rounded-full h-3 border border-slate-200 dark:border-slate-700 p-0.5">
                     <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${colorClass}`} 
                        style={{ width: `${percentage}%` }}
                     >
                         {tier === 'pro' && (
                             <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                         )}
                     </div>
                 </div>
                 
                 {tier !== 'pro' && percentage >= 80 && (
                     <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                         <AlertTriangle className="h-3 w-3" /> Running low on tokens!
                     </p>
                 )}
                 {tier === 'pro' && (
                     <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium flex items-center gap-1">
                        <InfinityIcon className="h-3 w-3" /> You have unlimited access.
                     </p>
                 )}
             </div>
        </div>
    );
};

const DocumentCard: React.FC<{ session: DocumentSession; delay: number; }> = ({ session, delay }) => {
    const { togglePin, deleteSession, updateSession } = useDocuments();
    const { t } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const { riskScore } = session.analysisResult || {};

    const getRiskColor = (score: number | undefined) => {
        if (score === undefined || score === null) return 'text-slate-400 dark:text-slate-500';
        if (score < 40) return 'text-green-500 dark:text-green-400';
        if (score < 70) return 'text-amber-500 dark:text-amber-400';
        return 'text-red-500 dark:text-red-400';
    };

    const getRiskLabel = (score: number | undefined) => {
        if (score === undefined || score === null) return '';
        if (score < 40) return t('analysis.riskLevels.low') || 'Low Risk';
        if (score < 70) return t('analysis.riskLevels.medium') || 'Medium Risk';
        return t('analysis.riskLevels.high') || 'High Risk';
    };

    const statusConfig = {
        completed: { text: t('status.completed'), color: 'bg-green-500/20 text-green-500 dark:text-green-400' },
        processing: { text: t('status.processing'), color: 'bg-amber-500/20 text-amber-500 dark:text-amber-400' },
        error: { text: t('status.error'), color: 'bg-red-500/20 text-red-500 dark:text-red-400' },
    };

    const handleDeleteRequest = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen(false);
        setIsConfirmingDelete(true);
    };

    const handleConfirmDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        deleteSession(session.id);
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsConfirmingDelete(false);
    };

    const handlePinToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(session.id);
        setIsMenuOpen(false);
    };

    const handleMoveToDashboard = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        updateSession(session.id, { folderId: null });
        setIsMenuOpen(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>) => {
        e.dataTransfer.setData('sessionId', session.id);
    };

    if (isConfirmingDelete) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-error flex flex-col justify-center items-center text-center transition-all duration-300">
                <AlertTriangle className="h-8 w-8 text-error mb-3" />
                <p className="font-semibold text-slate-900 dark:text-white mb-2">{t('dashboard.deleteConfirmTitle')}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('dashboard.deleteConfirmDesc', { fileName: session.fileName })}</p>
                <div className="flex gap-2 w-full">
                    <button onClick={handleCancelDelete} className="flex-1 px-4 py-2 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md transition-colors">{t('dashboard.cancel')}</button>
                    <button onClick={handleConfirmDelete} className="flex-1 px-4 py-2 text-sm bg-error hover:bg-red-700 text-white rounded-md transition-colors">{t('dashboard.documentMenu.delete')}</button>
                </div>
            </div>
        );
    }

    const hasFolder = !!session.folderId;

    return (
        <Link 
            to={`/analysis/${session.id}`} 
            className={`bg-white dark:bg-slate-800 p-6 rounded-lg hover:-translate-y-1 flex flex-col justify-between relative group animate-fade-in-up card-hover-glow cursor-grab
                ${session.isPinned ? 'border-2 border-amber-400 dark:border-amber-500 shadow-md' : 'border border-slate-200 dark:border-slate-700'}
            `}
            style={{ animationDelay: `${delay}ms` }}
            draggable="true"
            onDragStart={handleDragStart}
        >
            <div className="absolute top-4 right-4 flex items-center gap-2">
                 <div className="relative">
                    <button 
                        ref={buttonRef}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsMenuOpen(prev => !prev);
                        }} 
                        className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </button>
                    {isMenuOpen && (
                        <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10 py-1">
                            <button onClick={handlePinToggle} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                                <Bookmark className="h-4 w-4" />
                                {session.isPinned ? t('dashboard.documentMenu.unpin') : t('dashboard.documentMenu.pin')}
                            </button>
                            {hasFolder && (
                                <button onClick={handleMoveToDashboard} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                                    <CornerUpLeft className="h-4 w-4" />
                                    {t('dashboard.documentMenu.moveToDashboard')}
                                </button>
                            )}
                            <button onClick={handleDeleteRequest} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                {t('dashboard.documentMenu.delete')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-slate-900 dark:text-white truncate pr-16">{session.fileName}</p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[session.status].color}`}>
                        {statusConfig[session.status].text}
                    </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{session.title}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 line-clamp-2">
                    {session.status === 'processing' && t('status.processingDoc')}
                    {session.status === 'error' && t('status.errorDoc')}
                    {session.analysisResult?.summary || ''}
                </p>
            </div>
            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-700/50">
                <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-4">
                    {session.status === 'completed' && riskScore !== undefined && (
                        <div className={`flex items-center gap-1.5 text-xs font-semibold ${getRiskColor(riskScore)}`}>
                            <AlertTriangle className="h-4 w-4" />
                            <span>{getRiskLabel(riskScore)}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};


const DashboardPage: React.FC = () => {
    const { currentUser, tier } = useAuth();
    const { sessions, addSession, getFolder } = useDocuments();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { folderId } = useParams<{ folderId?: string }>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    useEffect(() => {
        if (folderId && !getFolder(folderId)) {
            navigate('/dashboard');
        }
    }, [folderId, getFolder, navigate]);

    const currentFolder = useMemo(() => getFolder(folderId), [folderId, getFolder]);

    const sessionsInView = useMemo(() => {
        const filtered = sessions.filter(s => {
            if (folderId) return s.folderId === folderId;
            return !s.folderId; // Show only un-foldered documents on main dashboard
        });
        return [...filtered].sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return b.createdAt - a.createdAt;
        });
    }, [sessions, folderId]);

    // Account-level usage statistics
    const accountTotalTokens = useMemo(() => {
        return sessions.reduce((acc, curr) => acc + (curr.tokenUsage || 0), 0);
    }, [sessions]);

    // View-level statistics (Folder or Dashboard)
    const viewStats = useMemo(() => ({
        total: sessionsInView.length,
        completed: sessionsInView.filter(s => s.status === 'completed').length,
        pinned: sessionsInView.filter(s => s.isPinned).length,
    }), [sessionsInView]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploading(true);
            try {
                const newSessionId = await addSession(file, folderId);
                navigate(`/analysis/${newSessionId}`);
            } catch (error) {
                console.error("Failed to add session:", error);
                // Consider adding user-facing error feedback here
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleUploadClick = () => {
        if (isUploading) return;
        fileInputRef.current?.click();
    };

    const userName = currentUser?.displayName || currentUser?.email.split('@')[0];
    const headerTitle = currentFolder ? currentFolder.name : t('dashboard.welcome', { userName });
    const headerSubtitle = currentFolder ? t('dashboard.folderSubtitle', { folderName: currentFolder.name }) : t('dashboard.subtitle');


    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white capitalize">{headerTitle}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{headerSubtitle}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Left Column: Upload Card */}
                <div
                    className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-6 flex items-center justify-center cursor-pointer animate-fade-in-up card-hover-glow glow-border relative overflow-hidden"
                    onClick={handleUploadClick}
                    style={{ animationDelay: '0ms', minHeight: '320px' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-50/50 dark:to-blue-900/10 pointer-events-none" />
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                        disabled={isUploading}
                    />
                    <div className="text-center relative z-10">
                        {isUploading ? (
                            <>
                                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
                                <h3 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard.uploading')}</h3>
                                <p className="mt-2 text-slate-500 dark:text-slate-400">{t('dashboard.uploadingSubtitle')}</p>
                            </>
                        ) : (
                            <>
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-6 rounded-full inline-block mb-6 shadow-sm">
                                    <Upload className="h-10 w-10 text-primary" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('dashboard.uploadTitle')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t('dashboard.uploadSubtitle')}</p>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Right Column: Usage & Stats */}
                <div className="lg:col-span-1 flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                     {/* Plan Usage Card (Account Level) */}
                     <div className="flex-grow min-h-[180px]">
                        <PlanUsageCard tier={tier} totalTokens={accountTotalTokens} />
                     </div>

                     {/* Compact Stats Row (View Level) */}
                     <div className="grid grid-cols-3 gap-3">
                         <CompactStatTile label="Total" value={viewStats.total} icon={Files} color="text-slate-500" />
                         <CompactStatTile label="Done" value={viewStats.completed} icon={TrendingUp} color="text-green-500" />
                         <CompactStatTile label="Pinned" value={viewStats.pinned} icon={Bookmark} color="text-amber-500" />
                     </div>
                </div>
            </div>

            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard.recentDocuments')}</h2>
                    {!folderId && sessions.length > 0 && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">{t('dashboard.dragHint')}</p>
                    )}
                </div>
                {sessionsInView.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessionsInView.map((session, index) => (
                            <DocumentCard key={session.id} session={session} delay={index * 100 + 400} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '400ms'}}>
                        {folderId ? (
                            <>
                                <FolderOpen className="h-12 w-12 mx-auto text-slate-400" />
                                <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-white">{t('dashboard.folderEmpty')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">{t('dashboard.folderEmptyDesc')}</p>
                            </>
                        ) : (
                             <>
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-white">{t('dashboard.noDocuments')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">{t('dashboard.noDocumentsDesc')}</p>
                             </>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default DashboardPage;