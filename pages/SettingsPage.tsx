import React, { useState, useEffect } from 'react';
import { useTheme, useAuth, useDocuments, useTools, useCalendar, useNotification } from '../App';
import { Moon, Sun, Type, LogOut, User, Trash2, HardDrive, Info, Palette, Check, CreditCard, Zap, Shield, Crown, Edit2 } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme, fontSize, setFontSize } = useTheme();
  const { currentUser, logout, updateProfile, tier, setTier } = useAuth();
  const { clearUserData: clearDocuments } = useDocuments();
  const { clearUserData: clearTools } = useTools();
  const { clearUserData: clearCalendar } = useCalendar();
  const { addNotification } = useNotification();
  
  const [activeTab, setActiveTab] = useState<'general' | 'accessibility' | 'account'>('accessibility');
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  
  const [displayNameInput, setDisplayNameInput] = useState(currentUser?.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Separate the viewed tier from the actual subscribed tier to allow browsing
  const [viewedTier, setViewedTier] = useState(tier);

  useEffect(() => {
      setDisplayNameInput(currentUser?.displayName || '');
  }, [currentUser]);

  // Sync viewed tier if the actual tier changes (e.g. after upgrade/downgrade)
  useEffect(() => {
    setViewedTier(tier);
  }, [tier]);

  const handleNameSave = () => {
      if (displayNameInput.trim() !== currentUser?.displayName) {
          updateProfile(displayNameInput.trim());
      }
      setIsEditingName(false);
  };

  const handleClearHistory = () => {
      clearDocuments();
      clearTools();
      clearCalendar();
      setShowClearDataConfirm(false);
      addNotification('success', 'History Cleared', 'All uploaded documents, analyses, quizzes, and comparisons have been deleted.');
  };

  const tabs = [
    { id: 'accessibility', label: 'Accessibility', icon: Palette },
    { id: 'account', label: 'Account', icon: User },
    { id: 'general', label: 'General', icon: Info },
  ];

  const tiers = {
      free: {
          price: '₹0',
          period: '/ month',
          features: ['50k Tokens / mo', 'Basic Summaries', 'Standard Risk Assessment', 'Email Support'],
          color: 'bg-slate-100 dark:bg-slate-700',
          textColor: 'text-slate-600 dark:text-slate-300',
          btnColor: 'bg-slate-500',
          icon: Shield
      },
      pro: {
          price: '₹3,999',
          period: '/ month',
          features: ['Unlimited Tokens', 'Consult a Lawyer Credits', 'Advanced Export (Word/PDF)', 'API Access', 'Dedicated Account Manager'],
          color: 'bg-amber-50 dark:bg-amber-900/20',
          textColor: 'text-amber-600 dark:text-amber-300',
          btnColor: 'bg-amber-600',
          icon: Crown
      }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'accessibility':
        return (
          <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Theme Section */}
                <section className="flex flex-col h-full">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Palette className="h-5 w-5" /> Theme
                  </h3>
                  
                  {/* Fancy Uiverse Switch */}
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-center items-center flex-grow min-h-[300px]">
                    <div className="uiverse-switch-wrapper scale-90 sm:scale-100">
                        <input 
                            id="uiverse-switch-input" 
                            className="uiverse-switch-input"
                            type="checkbox" 
                            checked={theme === 'dark'} 
                            onChange={toggleTheme} 
                        />
                        <div className="uiverse-app">
                            <div className="uiverse-body">
                                <div className="uiverse-phone">
                                    <div className="uiverse-menu"></div>
                                    <div className="uiverse-content">
                                        <div className="uiverse-circle">
                                            <div className="uiverse-crescent"></div>
                                        </div>
                                        <label htmlFor="uiverse-switch-input" className="uiverse-label">
                                            <div className="uiverse-toggle"></div>
                                            <div className="uiverse-names">
                                                <p className="uiverse-light">Light</p>
                                                <p className="uiverse-dark">Dark</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                </section>

                {/* Font Size Section */}
                <section className="flex flex-col h-full">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Type className="h-5 w-5" /> Font Size
                  </h3>
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col h-full justify-center min-h-[300px]">
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={() => setFontSize('small')}
                            className={`w-full py-4 px-6 rounded-lg text-sm font-medium border transition-all flex items-center justify-between ${fontSize === 'small' ? 'bg-primary text-white border-primary shadow-md transform scale-[1.02]' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                        >
                            <span>Small Text</span>
                            {fontSize === 'small' && <Check className="h-4 w-4" />}
                        </button>
                        <button 
                            onClick={() => setFontSize('medium')}
                            className={`w-full py-4 px-6 rounded-lg text-base font-medium border transition-all flex items-center justify-between ${fontSize === 'medium' ? 'bg-primary text-white border-primary shadow-md transform scale-[1.02]' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                        >
                            <span>Medium Text</span>
                            {fontSize === 'medium' && <Check className="h-5 w-5" />}
                        </button>
                        <button 
                            onClick={() => setFontSize('large')}
                            className={`w-full py-4 px-6 rounded-lg text-lg font-medium border transition-all flex items-center justify-between ${fontSize === 'large' ? 'bg-primary text-white border-primary shadow-md transform scale-[1.02]' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                        >
                            <span>Large Text</span>
                            {fontSize === 'large' && <Check className="h-6 w-6" />}
                        </button>
                    </div>
                    <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400 text-center">
                        "The quick brown fox jumps over the lazy dog."
                        </p>
                    </div>
                  </div>
                </section>
            </div>
          </div>
        );
      case 'account':
        const ActiveIcon = tiers[viewedTier].icon;
        
        const tierOrder = ['free', 'pro'];
        const currentTierIndex = tierOrder.indexOf(tier);
        const viewedTierIndex = tierOrder.indexOf(viewedTier);
        
        let buttonLabel = 'Current Plan';
        let isActionable = false;
        
        if (viewedTierIndex > currentTierIndex) {
            buttonLabel = `Upgrade to ${viewedTier.charAt(0).toUpperCase() + viewedTier.slice(1)}`;
            isActionable = true;
        } else if (viewedTierIndex < currentTierIndex) {
            buttonLabel = `Downgrade to ${viewedTier.charAt(0).toUpperCase() + viewedTier.slice(1)}`;
            isActionable = true;
        }

        return (
          <div className="space-y-8 animate-fade-in-up">
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="h-5 w-5" /> Profile
              </h3>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                 <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {currentUser?.email.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex-grow">
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Signed in as</p>
                     <p className="text-lg font-bold text-slate-900 dark:text-white">{currentUser?.email}</p>
                     
                     <div className="mt-2 flex items-center gap-2">
                        {isEditingName ? (
                            <div className="flex items-center gap-2 animate-fade-in-up">
                                <input 
                                    type="text" 
                                    value={displayNameInput} 
                                    onChange={(e) => setDisplayNameInput(e.target.value)}
                                    onBlur={handleNameSave}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                                    placeholder="Enter display name"
                                    className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    autoFocus
                                />
                                <button onClick={handleNameSave} className="p-1 bg-green-500/10 text-green-600 rounded hover:bg-green-500/20"><Check className="h-4 w-4"/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{currentUser?.displayName || 'Set Display Name'}</p>
                                <Edit2 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                     </div>
                 </div>
                 <div className="ml-4">
                     <button
                        onClick={logout}
                        className="flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                     >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                     </button>
                 </div>
              </div>
            </section>

            <section>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Billing & Plan
                  </h3>
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                        
                        {/* Glass Radio Group */}
                        <div className="billing-radio-group mb-8">
                            <input type="radio" id="tier-free" name="tier" checked={viewedTier === 'free'} onChange={() => setViewedTier('free')} />
                            <label htmlFor="tier-free">Free</label>
                            
                            <input type="radio" id="tier-pro" name="tier" checked={viewedTier === 'pro'} onChange={() => setViewedTier('pro')} />
                            <label htmlFor="tier-pro">Pro</label>
                            
                            <div className="billing-glider"></div>
                        </div>

                        {/* Content Area */}
                        <div key={viewedTier} className={`w-full max-w-lg p-6 rounded-xl border border-slate-100 dark:border-slate-700/50 ${tiers[viewedTier].color} billing-content active`}>
                             <div className="flex items-center justify-between mb-4">
                                 <div className="flex items-center gap-3">
                                     <div className={`p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm`}>
                                         <ActiveIcon className={`h-6 w-6 ${viewedTier === 'pro' ? 'text-amber-500' : 'text-slate-500'}`} />
                                     </div>
                                     <h4 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{viewedTier} Plan</h4>
                                 </div>
                                 <div className="text-right">
                                     <span className="text-2xl font-bold text-slate-900 dark:text-white">{tiers[viewedTier].price}</span>
                                     <span className="text-sm text-slate-500 dark:text-slate-400">{tiers[viewedTier].period}</span>
                                 </div>
                             </div>
                             
                             <ul className="space-y-3 mb-6">
                                 {tiers[viewedTier].features.map((feature, idx) => (
                                     <li key={idx} className="flex items-start gap-2 text-sm">
                                         <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${tiers[viewedTier].textColor}`} />
                                         <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                                     </li>
                                 ))}
                             </ul>
                             
                             <button 
                                onClick={() => isActionable && setTier(viewedTier)}
                                disabled={!isActionable}
                                className={`w-full py-3 rounded-lg text-white font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 ${tiers[viewedTier].btnColor} ${!isActionable ? 'opacity-80 cursor-default hover:translate-y-0 shadow-none' : ''}`}
                             >
                                 {buttonLabel}
                             </button>
                        </div>

                  </div>
            </section>
          </div>
        );
      case 'general':
        return (
          <div className="space-y-8 animate-fade-in-up">
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Info className="h-5 w-5" /> General Information
              </h3>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  LegalMitr is an AI-powered legal assistant designed to help you understand documents, assess risks, and draft legal content.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Version</p>
                        <p className="text-slate-500 dark:text-slate-400">2.5.0 (Beta)</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Build</p>
                        <p className="text-slate-500 dark:text-slate-400">2025.05.15</p>
                    </div>
                </div>
              </div>
            </section>

            <section>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <HardDrive className="h-5 w-5" /> Data Management
                </h3>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                        Clear all your local data, including analyzed documents, chat history, generated documents, and calendar events. This action cannot be undone.
                    </p>
                    
                    {showClearDataConfirm ? (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-lg">
                            <p className="font-bold text-red-600 dark:text-red-400 mb-2">Are you sure?</p>
                            <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4">This will permanently delete all your data from this browser.</p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowClearDataConfirm(false)}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleClearHistory}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                                >
                                    Yes, Delete Everything
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setShowClearDataConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg font-medium border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            Clear All Data
                        </button>
                    )}
                </div>
            </section>
          </div>
        );
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
        <header className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your preferences and account details.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Navigation */}
            <nav className="w-full md:w-64 flex-shrink-0 space-y-2">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Icon className="h-5 w-5" />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>

            {/* Main Content Area */}
            <div className="flex-grow">
                {renderContent()}
            </div>
        </div>
    </div>
  );
};

export default SettingsPage;