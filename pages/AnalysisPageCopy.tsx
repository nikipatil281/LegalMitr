import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob, Chat, Content } from "@google/genai";
import { marked } from 'marked';
import { FileText, CheckCircle, AlertTriangle, MessageSquare, Mic, Square, User, Bot, ChevronDown, Send, BookOpen, AlertCircle, FileWarning, Loader2, Clock, CalendarPlus, ShieldAlert, Share2, Download, ClipboardCopy, Users, Building, FileSearch, Paperclip, Upload, Repeat, Landmark, Scale } from 'lucide-react';
import { encode, decode, decodeAudioData } from '../services/audioUtils';
import { useDocuments, DocumentSession, ChatMessage, ClauseExplanationItem, MissingClauseItem, useLanguage, useCalendar, SupportingDocument } from '../App';

// Helper for API KEY
const getApiKey = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
  // @ts-ignore
  return process.env.API_KEY || '';
};

// --- RAG Types ---
type LegalChunk = {
    id: string;
    title: string;
    text: string;
    embedding: number[];
};

// --- RAG Utility: Cosine Similarity ---
function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const ThinkingLoader: React.FC<{className?: string}> = ({ className }) => (
  <div className={`thinking-loader text-slate-500 dark:text-slate-400 ${className}`} aria-label="AI is thinking">
    <span className={className}></span>
    <span className={className}></span>
    <span className={className}></span>
  </div>
);

enum ConversationState {
  Idle,
  Connecting,
  Listening,
  Replying,
  Error,
}

type AnalysisStep = {
  titleKey: string;
  descriptionKey: string;
  duration: number; // in milliseconds
  status: 'pending' | 'in-progress' | 'completed';
};

const analysisStepsConfig: Omit<AnalysisStep, 'status'>[] = [
  { titleKey: 'analysis.steps.extract', descriptionKey: 'analysis.steps.extractDesc', duration: 6000 },
  { titleKey: 'analysis.steps.clauses', descriptionKey: 'analysis.steps.clausesDesc', duration: 12000 },
  { titleKey: 'analysis.steps.risk', descriptionKey: 'analysis.steps.riskDesc', duration: 8000 },
  { titleKey: 'analysis.steps.missing', descriptionKey: 'analysis.steps.missingDesc', duration: 10000 },
  { titleKey: 'analysis.steps.finalize', descriptionKey: 'analysis.steps.finalizeDesc', duration: 4000 },
];

const DetailedAnalysisProgress: React.FC<{ steps: AnalysisStep[], currentStepIndex: number, overallProgress: number, timeRemaining: string }> = ({ steps, currentStepIndex, overallProgress, timeRemaining }) => {
  const { t } = useLanguage();
  const totalSteps = steps.length;
  const currentStepNumber = currentStepIndex + 1;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">{t('analysis.processingTitle')}</h2>
      <p className="text-center text-slate-500 dark:text-slate-400 mb-8">{t('analysis.processingSubtitle')}</p>
      
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('analysis.step', { current: currentStepNumber > totalSteps ? totalSteps : currentStepNumber, total: totalSteps })}</span>
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('analysis.complete', { percent: Math.round(overallProgress) })}</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all duration-300 ease-linear" style={{ width: `${overallProgress}%` }}></div>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-end">
            <Clock className="h-3 w-3 mr-1.5" />
            <span>{timeRemaining}</span>
        </div>
      </div>
      
      <div className="space-y-3 mt-8">
        {steps.map((step, index) => {
          const isInProgress = step.status === 'in-progress';
          
          const stepConfig = {
            pending: {
              icon: <div className="h-5 w-5 border-2 border-slate-400 dark:border-slate-500 rounded-full" />,
              classes: "bg-transparent dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
            },
            'in-progress': {
              icon: <Loader2 className="h-5 w-5 animate-spin text-white" />,
              classes: "bg-blue-600 border border-blue-500 text-white shadow-lg shadow-blue-500/20"
            },
            completed: {
              icon: <CheckCircle className="h-5 w-5 text-white" />,
              classes: "bg-green-600 border border-green-500 text-white"
            }
          };

          const currentConfig = stepConfig[step.status];

          return (
            <div key={index} className={`p-4 rounded-lg flex items-center justify-between transition-all duration-300 ${currentConfig.classes}`}>
              <div className="flex items-center">
                <div className={`flex-shrink-0 mr-4 h-8 w-8 rounded-full flex items-center justify-center ${isInProgress ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'}`}>
                  {currentConfig.icon}
                </div>
                <div>
                  <p className="font-semibold">{t(step.titleKey)}</p>
                  <p className="text-sm opacity-80">{t(step.descriptionKey)}</p>
                </div>
              </div>
              {isInProgress && (
                  <div className="flex items-center text-sm opacity-90">
                      <Clock className="h-4 w-4 mr-1.5" />
                      <span>{t('analysis.timeRemaining', { time: Math.ceil(step.duration / 1000) })}</span>
                  </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getRiskProfile = (score: number, t: (key: string) => string) => {
  if (score < 40) {
    return { level: t('analysis.riskLevels.low'), color: 'text-green-500', bgColor: 'bg-green-500' };
  }
  if (score < 70) {
    return { level: t('analysis.riskLevels.medium'), color: 'text-amber-500', bgColor: 'bg-amber-500' };
  }
  return { level: t('analysis.riskLevels.high'), color: 'text-red-500', bgColor: 'bg-red-500' };
};

const getCompletenessProfile = (score: number) => {
    if (score < 50) return { level: 'Low Completeness', color: 'bg-red-500' };
    if (score < 80) return { level: 'Medium Completeness', color: 'bg-amber-500' };
    return { level: 'High Completeness', color: 'bg-green-500' };
};

const AnalysisPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { getSession, updateSession, addSupportingDocument } = useDocuments();
  const { openEventModal } = useCalendar();
  const { t, language } = useLanguage();

  const [session, setSession] = useState<DocumentSession | undefined>(() => getSession(documentId));
  const [overallProgress, setOverallProgress] = useState(0);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(
      analysisStepsConfig.map(step => ({...step, status: 'pending'}))
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [timeRemaining, setTimeRemaining] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'clauses' | 'risk' | 'faq' | 'chat' | 'supporting'>('analysis');
  
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isRagEnabled, setIsRagEnabled] = useState(false); // RAG Toggle State
  const [legalIndex, setLegalIndex] = useState<LegalChunk[]>([]); // RAG Data
  const [copyStatus, setCopyStatus] = useState(t('analysis.copySummary'));

  const [conversationState, setConversationState] = useState<ConversationState>(ConversationState.Idle);
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [openSupporting, setOpenSupporting] = useState<string | null>(null);
  
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const [supportingComment, setSupportingComment] = useState('');
  const [isUploadingSupport, setIsUploadingSupport] = useState(false);
  const supportingFileInputRef = useRef<HTMLInputElement>(null);
  
  const isAnalyzing = useMemo(() => session?.status === 'processing', [session]);
  
  const chatRef = useRef<Chat | null>(null);
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  const sessionRefForCallbacks = useRef<DocumentSession | undefined>();
  
  const sessionPromise = useRef<Promise<any> | null>(null);
  const sessionRef = useRef<any>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
  const streamSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTime = useRef(0);
  const chatLogRef = useRef<HTMLDivElement>(null);

  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const analyserNode = useRef<AnalyserNode | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // --- RAG: Load Index Effect ---
  useEffect(() => {
    fetch('/legal_corpus_index.json')
        .then(res => res.json())
        .then(data => {
            console.log("Legal Index Loaded:", data.length, "chunks");
            setLegalIndex(data);
        })
        .catch(err => {
            console.error("Failed to load legal corpus index. RAG disabled.", err);
        });
  }, []);

  useEffect(() => {
    setCopyStatus(t('analysis.copySummary'));
  }, [t]);

  useEffect(() => {
    const currentSession = getSession(documentId);
    if (!currentSession) {
      navigate('/dashboard');
    } else {
      setSession(currentSession);
      if (currentSession.analysisResult && (currentSession.status === 'completed' || currentSession.status === 'error')) {
        setOpenAccordion(0);
      }
    }
  }, [documentId, getSession, navigate]);

  useEffect(() => {
    const currentSession = getSession(documentId);
    setSession(currentSession);
  }, [documentId, getSession]);

  useEffect(() => {
    sessionRefForCallbacks.current = session;
  }, [session]);
  
  useEffect(() => {
    if (chatLogRef.current) {
        chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [session?.chatHistory]);

  const stopConversation = useCallback(() => {
    mediaStream.current?.getTracks().forEach(track => track.stop());
    try {
      streamSource.current?.disconnect();
      scriptProcessor.current?.disconnect();
      analyserNode.current?.disconnect();
    } catch (e) {
      console.warn("Error disconnecting audio nodes", e);
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
      inputAudioContext.current.close().catch(console.error);
    }
    if (outputAudioContext.current && outputAudioContext.current.state !== 'closed') {
      outputAudioContext.current.close().catch(console.error);
    }
    sessionRef.current?.close();

    mediaStream.current = null;
    streamSource.current = null;
    scriptProcessor.current = null;
    analyserNode.current = null;
    animationFrameId.current = null;
    inputAudioContext.current = null;
    outputAudioContext.current = null;
    sessionRef.current = null;
    sessionPromise.current = null;
    
    setConversationState(prevState => prevState === ConversationState.Error ? ConversationState.Error : ConversationState.Idle);
  }, []);

  useEffect(() => { return () => { stopConversation(); }; }, [stopConversation]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return `~0s ${t('analysis.timeRemaining').split(' ')[1]}`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.ceil((ms % 60000) / 1000);
    if (minutes > 0) return `~${minutes}m ${seconds}s ${t('analysis.timeRemaining').split(' ')[1]}`;
    return t('analysis.timeRemaining', { time: seconds });
  };

  useEffect(() => {
    if (session?.status !== 'processing') {
      return; 
    }

    const totalDuration = analysisStepsConfig.reduce((sum, step) => sum + step.duration, 0);
    const startTime = session.createdAt;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= totalDuration) {
        setOverallProgress(99.9); 
        setTimeRemaining(t('analysis.finalizing'));
        setAnalysisSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        setCurrentStepIndex(analysisStepsConfig.length - 1);
        return;
      }

      setOverallProgress((elapsed / totalDuration) * 100);

      let cumulativeDuration = 0;
      let newCurrentStepIndex = -1;

      for (let i = 0; i < analysisStepsConfig.length; i++) {
        const stepEnd = cumulativeDuration + analysisStepsConfig[i].duration;
        if (elapsed < stepEnd) {
          newCurrentStepIndex = i;
          break;
        }
        cumulativeDuration += analysisStepsConfig[i].duration;
      }
      
      if(newCurrentStepIndex === -1) newCurrentStepIndex = analysisStepsConfig.length - 1;

      setCurrentStepIndex(newCurrentStepIndex);
      setAnalysisSteps(prev => prev.map((step, index) => {
        if (index < newCurrentStepIndex) return { ...step, status: 'completed' };
        if (index === newCurrentStepIndex) return { ...step, status: 'in-progress' };
        return { ...step, status: 'pending' };
      }));
      
      setTimeRemaining(formatTime(totalDuration - elapsed));

    }, 200);

    return () => clearInterval(interval);

  }, [session?.status, session?.createdAt, t]);
  
  const initChat = () => {
     if (!chatRef.current && session?.analysisResult) {
       const ai = new GoogleGenAI({ apiKey: getApiKey() });
       const history = (session.chatHistory || []).map((msg) => ({ role: msg.role as 'user' | 'model', parts: [{text: msg.text}] })) as Content[];
       
       const langPrompt = language !== 'en' ? `Respond to the user in ${language} language.` : '';

       chatRef.current = ai.chats.create({ 
           model: 'gemini-2.5-pro', 
           config: { 
               systemInstruction: `You are LegalMitr, a specialized legal AI assistant. 
CONTEXT: The user has uploaded a legal document. An analysis is provided below.
INSTRUCTIONS:
1. Answer questions strictly related to the uploaded document, its content, or the analysis provided.
2. Answer general questions about Indian Law or legal principles.
3. REFUSE to answer questions unrelated to law or the document (e.g. general knowledge, math, creative writing not related to law).
4. If a question is out of scope, politely state you are a legal assistant and can only discuss the document or legal matters.
5. ${langPrompt}
DOCUMENT ANALYSIS: ${JSON.stringify(session.analysisResult)}`, 
            }, 
            history 
        });
     }
  };

  useEffect(() => {
    if (activeTab === 'chat') { initChat(); }
  }, [activeTab, session?.analysisResult, language]);

  const handleSendTextMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!chatInput.trim() || !session) return;
    
    initChat();
    if (!chatRef.current) return;

    const message = chatInput.trim();
    setChatInput('');
    setIsChatting(true);

    const userMessage: ChatMessage = { role: 'user', text: message };
    const baseHistoryWithUserMessage: ChatMessage[] = [...(session.chatHistory || []).map(m => ({ text: m.text, role: m.role as 'user' | 'model', })), userMessage];
    updateSession(session.id, { chatHistory: baseHistoryWithUserMessage });
    
    const modelPlaceholder: ChatMessage = { role: 'model', text: '' };
    const historyWithPlaceholder = [...baseHistoryWithUserMessage, modelPlaceholder];
    updateSession(session.id, { chatHistory: historyWithPlaceholder });

    // RAG Logic / Augmented Prompt
    let messageToSend = message;
    
    if (isRagEnabled && legalIndex.length > 0) {
        try {
            const ai = new GoogleGenAI({ apiKey: getApiKey() });
            
            // 1. Embed user query
            const embeddingResponse = await ai.models.embedContent({
                model: "text-embedding-004",
                contents: message,
            });
            const userVector = (embeddingResponse.embedding?.values || []) as number[];

            // 2. Perform Cosine Similarity Search (Client-Side)
            const scoredChunks = legalIndex.map(chunk => ({
                ...chunk,
                score: cosineSimilarity(userVector, chunk.embedding)
            }));
            
            // 3. Sort by similarity desc
            scoredChunks.sort((a, b) => b.score - a.score);
            
            // 4. Take top 3
            const topChunks = scoredChunks.slice(0, 3);
            
            // 5. Construct Augmented Prompt
            let contextString = topChunks.map(c => `SOURCE: [${c.title}]\nCONTENT: ${c.text}`).join('\n\n');            
            messageToSend = `
            You are an expert legal assistant. Use the following context to answer the user's question.
            
            --- CONTEXT START ---
            ${contextString}
            --- CONTEXT END ---
            
            USER QUESTION: ${message}
            
            INSTRUCTIONS:
            1. Answer strictly based on the provided context if possible.
            2. CRITICAL: You MUST cite your sources. When you state a fact, append the source name in bold brackets immediately after. 
               Example: "The state shall not deny equality before the law **[Source: 202407...pdf (Part 1)]**."
            3. If the provided context does not contain the answer, say "I couldn't find specific details in the uploaded legal corpus," and then provide a general legal answer based on your training.
            `;
            
            console.log("RAG Augmented Prompt:", messageToSend);

        } catch (err) {
            console.error("RAG processing failed:", err);
            // Fallback to normal message if embedding fails
        }
    } else if (isRagEnabled && legalIndex.length === 0) {
        // Fallback message if index not loaded
        messageToSend = `${message} (Note: Local RAG index not loaded, answering based on general knowledge)`;
    }

    try {
        const responseStream = await chatRef.current.sendMessageStream({ message: messageToSend });
        let accumulatedText = '';
        for await (const chunk of responseStream) {
            accumulatedText += chunk.text ?? '';
            updateSession(session.id, { chatHistory: [...baseHistoryWithUserMessage, { role: 'model', text: accumulatedText }] });
        }
    } catch (err: any) {
        console.error("Chat failed:", err);
        const errorMessage = err.message || "Sorry, I encountered an error. Please try again.";
        updateSession(session.id, { 
            chatHistory: [...baseHistoryWithUserMessage, { 
                role: 'model', 
                text: `**Error:** ${errorMessage}` 
            }] 
        });
    } finally {
        setIsChatting(false);
    }
  };

  const handleAskAboutClause = (item: ClauseExplanationItem) => {
    const question = `Can you explain the clause titled "${item.title}" in more detail?\n\nHere is the original text for context:\n"${item.originalText}"`;
    setActiveTab('chat');
    setChatInput(question);
  };
  
  const handleAskAboutMissingClause = (item: MissingClauseItem) => {
      const question = `The analysis mentioned a missing clause: "${item.title}". Can you explain why this is important and provide more detailed examples of what this clause should contain?`;
      setActiveTab('chat');
      setChatInput(question);
  };

  const startConversation = async () => {
    if (conversationState !== ConversationState.Idle) return;
    setConversationState(ConversationState.Connecting);

    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStream.current = stream;

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        inputAudioContext.current = new AudioContext({ sampleRate: 16000 });
        outputAudioContext.current = new AudioContext({ sampleRate: 24000 });
        
        const outputNode = outputAudioContext.current.createGain();
        outputNode.connect(outputAudioContext.current.destination);
        const sources = new Set<AudioBufferSourceNode>();

        analyserNode.current = inputAudioContext.current.createAnalyser();
        analyserNode.current.fftSize = 256;
        
        const langPrompt = language !== 'en' ? `Respond to the user in ${language} language.` : '';

        sessionPromise.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: `You are LegalMitr, a specialized legal AI assistant. 
CONTEXT: The user has uploaded a legal document. An analysis is provided below.
INSTRUCTIONS:
1. Answer questions strictly related to the uploaded document, its content, or the analysis provided.
2. Answer general questions about Indian Law or legal principles.
3. REFUSE to answer questions unrelated to law or the document (e.g. general knowledge, math, creative writing not related to law).
4. If a question is out of scope, politely state you are a legal assistant and can only discuss the document or legal matters.
5. ${langPrompt}
DOCUMENT ANALYSIS: ${JSON.stringify(session?.analysisResult)}`,
            },
            callbacks: {
                onopen: () => {
                    setConversationState(ConversationState.Listening);
                    
                    const source = inputAudioContext.current!.createMediaStreamSource(stream);
                    streamSource.current = source;
                    
                    scriptProcessor.current = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob: GenAIBlob = {
                            data: encode(new Uint8Array(new Int16Array(inputData.map(d => d * 32768)).buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        
                        sessionPromise.current?.then((session) => {
                           session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    source.connect(scriptProcessor.current);
                    scriptProcessor.current.connect(inputAudioContext.current!.destination);
                    source.connect(analyserNode.current!);
                },
                onmessage: async (message: LiveServerMessage) => {
                    setConversationState(ConversationState.Replying);
                    
                    if (message.serverContent?.inputTranscription) currentInputTranscription.current += message.serverContent.inputTranscription.text;
                    if (message.serverContent?.outputTranscription) currentOutputTranscription.current += message.serverContent.outputTranscription.text;

                    if (message.serverContent?.turnComplete && sessionRefForCallbacks.current && (currentInputTranscription.current || currentOutputTranscription.current)) {
                        const currentSession = sessionRefForCallbacks.current;
                        const newHistory: ChatMessage[] = [];
                        if (currentInputTranscription.current) newHistory.push({ role: 'user', text: currentInputTranscription.current });
                        if (currentOutputTranscription.current) newHistory.push({ role: 'model', text: currentOutputTranscription.current });
                        if(newHistory.length > 0) updateSession(currentSession.id, { chatHistory: [...(currentSession.chatHistory || []), ...newHistory] });
                        currentInputTranscription.current = '';
                        currentOutputTranscription.current = '';
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio) {
                        nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.current!.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio!), outputAudioContext.current!, 24000, 1);
                        const source = outputAudioContext.current!.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.addEventListener('ended', () => {
                            sources.delete(source);
                            if (sources.size === 0) setConversationState(ConversationState.Listening);
                        });
                        source.start(nextStartTime.current);
                        nextStartTime.current += audioBuffer.duration;
                        sources.add(source);
                    }
                    const interrupted = message.serverContent?.interrupted;
                    if (interrupted) {
                        for (const source of sources.values()) {
                            source.stop();
                            sources.delete(source);
                        }
                        nextStartTime.current = 0;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setError('Voice connection error. Please try again.');
                    setConversationState(ConversationState.Error);
                    stopConversation();
                },
                onclose: (e: CloseEvent) => {
                    stopConversation();
                },
            },
        });
        sessionRef.current = await sessionPromise.current;
    } catch (err) {
        console.error('Failed to start conversation:', err);
        setError('Could not access microphone. Please check your browser permissions.');
        setConversationState(ConversationState.Error);
        setTimeout(() => setConversationState(ConversationState.Idle), 3000);
    }
  };

  useEffect(() => {
    const isVisualizerActive = conversationState === ConversationState.Listening || conversationState === ConversationState.Replying;
    
    if (!isVisualizerActive || !analyserNode.current || !visualizerCanvasRef.current) {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        return;
    }
    const canvas = visualizerCanvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const analyser = analyserNode.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      const color = theme === 'dark' ? '#3b82f6' : '#1e3a8a';
      canvasCtx.fillStyle = color;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
  }, [conversationState]);

  const handleDownloadPdf = useCallback(() => {
        if (!session?.analysisResult) return;
        const reportHtml = `
            <html><head><title>Analysis Report for ${session.fileName}</title>
            <style>body { font-family: sans-serif; }</style></head><body><h1>Report</h1><p>...</p></body></html>
        `; 
        const printWindow = window.open('', '_blank');
        if(printWindow) {
            printWindow.document.write(reportHtml); 
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 500);
        }
    }, [session, t]);
    
  const handleCopySummary = useCallback(() => {
        if (!session?.analysisResult) return;
        const { summary, riskScore, riskSummary, missingClauseAnalysis, keyParties } = session.analysisResult;
        const partiesText = keyParties && keyParties.length > 0 ? `KEY PARTIES:\n${keyParties.map(p => `- ${p.name} (${p.role})`).join('\n')}\n` : '';
        const riskProfile = getRiskProfile(riskScore, t);
        const compProfile = getCompletenessProfile(missingClauseAnalysis.completenessScore);
        const textToCopy = `Analysis Summary for: ${session.title}\n----------------------------------------\n\nOVERALL SUMMARY:\n${summary}\n\n${partiesText}RISK ASSESSMENT:\nRisk Level: ${riskProfile.level}\n${riskSummary}\n\nDOCUMENT COMPLETENESS:\nLevel: ${compProfile.level}\n${missingClauseAnalysis.completenessSummary}`.trim().replace(/ +/g, ' ');

        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopyStatus(t('analysis.copied'));
            setTimeout(() => setCopyStatus(t('analysis.copySummary')), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            setCopyStatus(t('analysis.copyFailed'));
            setTimeout(() => setCopyStatus(t('analysis.copySummary')), 2000);
        });
    }, [session, t]);
    
  const handleUploadSupportingDoc = async () => {
      if (!supportingFile || !session) return;
      setIsUploadingSupport(true);
      await addSupportingDocument(session.id, supportingFile, supportingComment);
      setSupportingFile(null);
      setSupportingComment('');
      setIsUploadingSupport(false);
  };
  
  const handleSupportingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files?.[0]) setSupportingFile(e.target.files[0]);
  };
  
  const TabButton: React.FC<{ tabName: typeof activeTab; label: string; icon: React.ElementType }> = ({ tabName, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      disabled={!session?.analysisResult && (tabName !== 'analysis')}
      className={'flex-shrink-0 flex items-center justify-center gap-2 p-3 px-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600 rounded-lg whitespace-nowrap ' + (activeTab === tabName ? 'text-blue-500 dark:text-blue-400 glow-border' : 'text-slate-500 dark:text-slate-400 border-[3px] border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50')}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );

  const getDocumentDescription = () => {
      if (session?.analysisResult?.documentSubject) return session.analysisResult.documentSubject;
      if (!session?.analysisResult?.summary) return t('analysis.processingDoc');
      const firstSentence = session.analysisResult.summary.split(/(\.|\n)/)[0];
      return firstSentence + (firstSentence.endsWith('.') ? '' : '.');
  };

  const renderTabContent = () => {
    if (!session) return null;

    if (session.status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-red-500/10 text-red-400 rounded-lg">
                <AlertCircle className="h-12 w-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">{t('analysis.errorTitle')}</h3>
                <p>{t('analysis.errorDesc')}</p>
                <p className="text-sm mt-1">{t('analysis.errorSuggestion')}</p>
            </div>
        );
    }

    if (isAnalyzing) {
        return (
            <DetailedAnalysisProgress 
                steps={analysisSteps}
                currentStepIndex={currentStepIndex}
                overallProgress={overallProgress}
                timeRemaining={timeRemaining}
            />
        );
    }
    
    switch (activeTab) {
        case 'analysis':
          if (!session.analysisResult) return null;
          const { summary, keyNumbers, keyParties } = session.analysisResult;
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    {t('analysis.summary')}
                  </h3>
                  <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
                    <p>{summary}</p>
                  </div>
                </div>
              </div>
  
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    {t('analysis.keyNumbers')}
                  </h3>
                  {keyNumbers && keyNumbers.length > 0 ? (
                    <ul className="space-y-3">
                      {keyNumbers.map((item, index) => {
                          const isActionable = item.isDate || item.isRecurring;
                          return (
                            <li key={index} className="flex flex-col pb-2 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0 group">
                              <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-sm text-slate-500 dark:text-slate-400 block mb-0.5">{item.key}</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.value}</span>
                                  </div>
                                  {isActionable && (
                                      <button 
                                        onClick={() => openEventModal({
                                            title: item.key,
                                            date: item.isoDate ? new Date(item.isoDate).getTime() : Date.now(),
                                            description: `Extracted from ${session.fileName}: ${item.value}`,
                                            recurrence: item.isRecurring ? (item.recurrenceInterval || 'monthly') : 'none',
                                            documentId: session.id,
                                            documentTitle: session.fileName
                                        })}
                                        className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title={t('calendar.title')}
                                      >
                                          <CalendarPlus className="h-4 w-4" />
                                      </button>
                                  )}
                              </div>
                              {item.isRecurring && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 font-medium bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded w-fit">
                                      <Repeat className="h-3 w-3" /> Recurring {item.recurrenceInterval}
                                  </span>
                              )}
                            </li>
                          );
                      })}
                    </ul>
                  ) : (
                    <div className="text-center py-4 text-slate-500">
                        <p className="text-sm font-medium">{t('analysis.noKeyNumbersTitle')}</p>
                        <p className="text-xs mt-1">{t('analysis.noKeyNumbersDesc')}</p>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-500" />
                        {t('analysis.keyParties')}
                    </h3>
                    {keyParties && keyParties.length > 0 ? (
                        <ul className="space-y-3">
                            {keyParties.map((party, idx) => (
                                <li key={idx} className="flex items-start gap-3 pb-2 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                                    <div className={`p-2 rounded-full ${party.type === 'Organization' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                        {party.type === 'Organization' ? <Building className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{party.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{party.role}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-slate-500">No parties detected.</p>}
                </div>
              </div>
            </div>
          );
  
        case 'clauses':
            if (!session.analysisResult) return null;
            const { clauseExplanations } = session.analysisResult;
            return (
                <div className="animate-fade-in-up space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileSearch className="h-6 w-6 text-purple-500" />
                            {t('analysis.clauseExplanations')}
                        </h3>
                    </div>
                    {clauseExplanations && clauseExplanations.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {clauseExplanations.map((item, index) => {
                                const isOpen = openAccordion === index;
                                return (
                                    <div key={index} className={`border rounded-lg bg-white dark:bg-slate-800 overflow-hidden transition-all duration-300 ${isOpen ? 'shadow-md border-purple-200 dark:border-purple-900 ring-1 ring-purple-100 dark:ring-purple-900/30' : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'}`}>
                                        <button 
                                            onClick={() => setOpenAccordion(isOpen ? null : index)}
                                            className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-md ${isOpen ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                                            </div>
                                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        <div className={`accordion-content ${isOpen ? 'accordion-content-open' : ''}`}>
                                            <div className="px-4 pb-4 pt-0 space-y-4">
                                                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/20">
                                                    <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">{t('analysis.whatThisMeans')}</h4>
                                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{item.explanation}</p>
                                                </div>

                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('analysis.originalText')}</h4>
                                                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-600 dark:text-slate-400 italic">
                                                        "{item.originalText}"
                                                    </div>
                                                </div>

                                                {item.legalTerms && item.legalTerms.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t('analysis.legalTerms')}</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.legalTerms.map((term, tIdx) => (
                                                                <div key={tIdx} className="group relative cursor-help">
                                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                                                        {term.term}
                                                                    </span>
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                                                        {term.definition}
                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="pt-2 flex justify-end">
                                                    <button 
                                                        onClick={() => handleAskAboutClause(item)}
                                                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                    >
                                                        <MessageSquare className="h-3 w-3" />
                                                        {t('analysis.askAboutClause')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                             <FileWarning className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                             <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('analysis.noClausesTitle')}</h3>
                             <p className="text-slate-500 dark:text-slate-400">{t('analysis.noClausesDesc')}</p>
                        </div>
                    )}
                </div>
            );

        case 'risk':
            if (!session.analysisResult) return null;
            const { riskScore, riskSummary, missingClauseAnalysis, partyRisks } = session.analysisResult;
            const riskProfile = getRiskProfile(riskScore, t);
            const completenessProfile = getCompletenessProfile(missingClauseAnalysis.completenessScore);

            return (
                <div className="animate-fade-in-up space-y-8">
                    {/* Overall Score Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Risk Score */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-slate-500" />
                                {t('analysis.overallRisk')}
                            </h3>
                            <div className="relative h-32 w-32 flex items-center justify-center mb-4">
                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                    <path className="text-slate-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className={`${riskProfile.color} transition-all duration-1000 ease-out`} strokeDasharray={`${riskScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className={`text-3xl font-bold ${riskProfile.color}`}>{riskScore}</span>
                                    <span className="text-xs text-slate-400">/100</span>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${riskProfile.bgColor} text-white mb-3`}>
                                {riskProfile.level}
                            </span>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{riskSummary}</p>
                        </div>

                        {/* Completeness Score */}
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-slate-500" />
                                {t('analysis.completeness')}
                            </h3>
                            <div className="relative h-32 w-32 flex items-center justify-center mb-4">
                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                    <path className="text-slate-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className={`${completenessProfile.color.replace('bg-', 'text-')} transition-all duration-1000 ease-out`} strokeDasharray={`${missingClauseAnalysis.completenessScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className={`text-3xl font-bold ${completenessProfile.color.replace('bg-', 'text-')}`}>{missingClauseAnalysis.completenessScore}</span>
                                    <span className="text-xs text-slate-400">/100</span>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${completenessProfile.color} text-white mb-3`}>
                                {completenessProfile.level}
                            </span>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{missingClauseAnalysis.completenessSummary}</p>
                        </div>
                    </div>

                    {/* Party Risks */}
                    {partyRisks && partyRisks.length > 0 && (
                        <div>
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5 text-indigo-500" />
                                {t('analysis.partyRisk')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {partyRisks.map((pr, idx) => {
                                    const prProfile = getRiskProfile(pr.score, t);
                                    return (
                                        <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200">{pr.party}</h4>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${prProfile.bgColor} text-white`}>Risk: {pr.score}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{pr.summary}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Missing Clauses */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <FileWarning className="h-5 w-5 text-red-500" />
                            {t('analysis.missingClauses', { count: missingClauseAnalysis.missingClauses.length })}
                        </h3>
                        {missingClauseAnalysis.missingClauses.length > 0 ? (
                            <div className="space-y-4">
                                {missingClauseAnalysis.missingClauses.map((item, index) => (
                                    <div key={index} className="bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-900/30 overflow-hidden shadow-sm">
                                        <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 flex justify-between items-center border-b border-red-100 dark:border-red-900/30">
                                            <span className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                {item.title}
                                            </span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded text-white ${item.severity === 'Critical' ? 'bg-red-600' : item.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                                                {item.severity} Severity
                                            </span>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('analysis.whatItProtects')}</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.protection}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('analysis.riskWithout')}</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.risk}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
                                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('analysis.suggestion')}</p>
                                                <p className="text-sm font-mono text-slate-600 dark:text-slate-400 italic">"{item.suggestion}"</p>
                                            </div>
                                            <div className="flex justify-end pt-1">
                                                <button 
                                                    onClick={() => handleAskAboutMissingClause(item)}
                                                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                >
                                                    <MessageSquare className="h-3 w-3" />
                                                    {t('analysis.askAboutMissing')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900/30">
                                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-green-800 dark:text-green-300">No Critical Clauses Missing</h3>
                                <p className="text-green-600 dark:text-green-400">This document appears to cover all standard bases.</p>
                            </div>
                        )}
                    </div>
                </div>
            );

        case 'faq':
            if (!session.analysisResult) return null;
            const { faq } = session.analysisResult;
            return (
                <div className="animate-fade-in-up space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                        <BookOpen className="h-6 w-6 text-teal-500" />
                        {t('analysis.faq')}
                    </h3>
                    <div className="space-y-4">
                        {faq.map((item, index) => {
                            const isOpen = openFaq === index;
                            return (
                                <div key={index} className={`bg-white dark:bg-slate-800 rounded-lg border transition-all duration-300 ${isOpen ? 'border-teal-500 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'}`}>
                                    <button 
                                        onClick={() => setOpenFaq(isOpen ? null : index)}
                                        className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                                    >
                                        <span className={`font-semibold ${isOpen ? 'text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200'}`}>{item.question}</span>
                                        <div className={`p-1 rounded-full transition-colors ${isOpen ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>
                                    <div className={`accordion-content ${isOpen ? 'accordion-content-open' : ''}`}>
                                        <div className="px-4 pb-4 pt-0">
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">{item.answer}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );

        case 'supporting':
             return (
                 <div className="animate-fade-in-up space-y-8">
                     {/* Upload Section */}
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-center">
                         <div className="flex flex-col items-center">
                             <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-4">
                                 <Paperclip className="h-8 w-8 text-blue-500" />
                             </div>
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('analysis.supportingUploadTitle')}</h3>
                             <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">{t('analysis.supportingUploadDesc')}</p>
                             
                             <div className="w-full max-w-md space-y-3">
                                 <input 
                                     type="file" 
                                     ref={supportingFileInputRef}
                                     onChange={handleSupportingFileSelect}
                                     className="hidden"
                                     accept="application/pdf,text/plain,image/*"
                                 />
                                 
                                 <div className="flex gap-2">
                                     <button 
                                         onClick={() => supportingFileInputRef.current?.click()}
                                         className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium truncate"
                                     >
                                         {supportingFile ? supportingFile.name : 'Select File'}
                                     </button>
                                 </div>
                                 
                                 {supportingFile && (
                                     <>
                                         <input 
                                             type="text" 
                                             value={supportingComment}
                                             onChange={(e) => setSupportingComment(e.target.value)}
                                             placeholder={t('analysis.addComment')}
                                             className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                         />
                                         <button 
                                             onClick={handleUploadSupportingDoc}
                                             disabled={isUploadingSupport}
                                             className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                                         >
                                             {isUploadingSupport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                             {t('analysis.uploadBtn')}
                                         </button>
                                     </>
                                 )}
                             </div>
                         </div>
                     </div>
 
                     {/* List Section */}
                     <div className="space-y-4">
                         <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                             <FileText className="h-5 w-5 text-slate-500" />
                             Analyzed Supporting Documents
                         </h3>
                         
                         {session.supportingDocuments && session.supportingDocuments.length > 0 ? (
                             session.supportingDocuments.map((doc) => {
                                 const isOpen = openSupporting === doc.id;
                                 return (
                                     <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                         <button 
                                             onClick={() => setOpenSupporting(isOpen ? null : doc.id)}
                                             className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                         >
                                             <div className="flex items-center gap-3">
                                                 <div className={`p-2 rounded-lg ${doc.status === 'completed' ? 'bg-green-100 text-green-600' : doc.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                     <Paperclip className="h-5 w-5" />
                                                 </div>
                                                 <div>
                                                     <p className="font-semibold text-slate-900 dark:text-white">{doc.fileName}</p>
                                                     <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</p>
                                                 </div>
                                             </div>
                                             <div className="flex items-center gap-3">
                                                 {doc.status === 'processing' && <span className="text-xs font-bold text-amber-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Analyzing</span>}
                                                 <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                             </div>
                                         </button>
                                         
                                         {isOpen && doc.status === 'completed' && doc.analysis && (
                                             <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 space-y-4">
                                                 <div>
                                                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{t('analysis.summary')}</h4>
                                                     <p className="text-sm text-slate-700 dark:text-slate-300">{doc.analysis.summary}</p>
                                                 </div>
                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                     <div>
                                                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Relevance</h4>
                                                         <p className="text-sm text-slate-700 dark:text-slate-300">{doc.analysis.relevanceToPrimary}</p>
                                                     </div>
                                                     <div>
                                                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{t('analysis.riskImplications')}</h4>
                                                         <p className="text-sm text-slate-700 dark:text-slate-300">{doc.analysis.riskImplications}</p>
                                                     </div>
                                                 </div>
                                                 <div>
                                                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{t('analysis.connections')}</h4>
                                                     <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">
                                                         {doc.analysis.keyConnections.map((conn, i) => (
                                                             <li key={i}>{conn}</li>
                                                         ))}
                                                     </ul>
                                                 </div>
                                                 {doc.userComment && (
                                                     <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-sm italic text-slate-600 dark:text-slate-400">
                                                         "User Note: {doc.userComment}"
                                                     </div>
                                                 )}
                                             </div>
                                         )}
                                     </div>
                                 );
                             })
                         ) : (
                             <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                 {t('analysis.noSupportingDocs')}
                             </div>
                         )}
                     </div>
                 </div>
             );

        case 'chat': {
            const chatHistory = session.chatHistory || [];
            return (
                <div className="h-[calc(100vh-220px)] min-h-[500px] animate-fade-in-up flex flex-col gap-4">
                     {/* Modular Container */}
                     <div className="flex-grow bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col relative">
                         
                         {/* Header */}
                         <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm z-10">
                            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 font-semibold">
                                <div className="bg-primary/10 p-1.5 rounded-lg">
                                    <Bot className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">AI Assistant</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Ask about your document</p>
                                </div>
                            </div>

                            {/* Center - RAG Toggle */}
                            <div 
                                onClick={() => setIsRagEnabled(!isRagEnabled)}
                                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full transition-colors border ${isRagEnabled ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                title={legalIndex.length === 0 ? "Index not loaded. Run generation script first." : "Toggle RAG"}
                            >
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${isRagEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${isRagEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {isRagEnabled ? <Scale className="h-3 w-3 text-amber-600 dark:text-amber-400" /> : <Landmark className="h-3 w-3 text-slate-400" />}
                                    <span className={`text-xs font-semibold select-none ${isRagEnabled ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        Ground with Indian Law {legalIndex.length === 0 && "(Index Missing)"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${conversationState !== ConversationState.Idle ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {conversationState !== ConversationState.Idle ? 'Live Audio' : 'Online'}
                                </span>
                            </div>
                         </div>

                         {/* Chat Log */}
                         <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 bg-slate-50/30 dark:bg-slate-900/20" ref={chatLogRef}>
                             {chatHistory.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 opacity-60">
                                     <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-full mb-6 shadow-inner">
                                        <Bot className="h-12 w-12 text-primary/60" />
                                     </div>
                                     <p className="text-center px-6 max-w-md text-base font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: t('analysis.chatEmpty') }} />
                                 </div>
                             ) : (
                                 chatHistory.map((msg, idx) => {
                                     // Check if this is a "Thinking" placeholder
                                     const isThinking = msg.role === 'model' && !msg.text && idx === chatHistory.length - 1;

                                     return (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`
                                                    px-6 py-5 rounded-2xl border shadow-sm 
                                                    ${msg.role === 'user' 
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' 
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}
                                                `}>
                                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
                                                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                                                            {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                                                        </div>
                                                        <span className={`text-xs font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                                                            {msg.role === 'user' ? 'You' : 'LegalMitr AI'}
                                                        </span>
                                                    </div>
                                                    
                                                    {isThinking ? (
                                                        <div className="py-2 space-y-3 min-w-[200px]">
                                                            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                                                <span>LegalMitr is thinking...</span>
                                                            </div>
                                                            <div className="space-y-2 opacity-60">
                                                                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-full animate-pulse"></div>
                                                                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-4/5 animate-pulse"></div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={`text-base leading-relaxed ${msg.role === 'user' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                                            <div className="prose prose-slate dark:prose-invert max-w-none break-words" dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) as string }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                     );
                                 })
                             )}
                         </div>

                         {/* Input Area */}
                         <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/50">
                            <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-inner">
                                 <button
                                     onClick={conversationState === ConversationState.Idle ? startConversation : stopConversation}
                                     className={`p-3 rounded-full transition-all duration-300 flex-shrink-0 mb-0.5 ${
                                         conversationState !== ConversationState.Idle 
                                         ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                                         : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-primary shadow-sm border border-slate-200 dark:border-slate-700'
                                     }`}
                                     title={conversationState === ConversationState.Idle ? "Start Voice Chat" : "Stop Voice Chat"}
                                 >
                                     {conversationState !== ConversationState.Idle ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
                                 </button>

                                 <div className="flex-grow relative py-2">
                                     <textarea
                                         value={chatInput}
                                         onChange={(e) => setChatInput(e.target.value)}
                                         onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendTextMessage();
                                            }
                                         }}
                                         placeholder={t('analysis.chatPlaceholder')}
                                         disabled={isChatting || conversationState !== ConversationState.Idle}
                                         className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-2 text-base resize-none"
                                         rows={3}
                                     />
                                 </div>
                                 
                                 <button
                                     onClick={() => handleSendTextMessage()}
                                     disabled={!chatInput.trim() || isChatting || conversationState !== ConversationState.Idle}
                                     className="p-3 bg-primary text-white rounded-full hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-sm mb-0.5"
                                 >
                                     {isChatting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                 </button>
                            </div>
                             
                             {conversationState !== ConversationState.Idle && (
                                 <div className="mt-3 flex flex-col items-center animate-fade-in-up bg-slate-50 dark:bg-slate-900/80 rounded-xl p-3 border border-slate-100 dark:border-slate-800 backdrop-blur">
                                     <div className="flex items-center justify-between w-full px-2 mb-2">
                                         <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Live Voice Session</span>
                                         <div className="flex items-center gap-2">
                                             {conversationState === ConversationState.Connecting && <span className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> {t('analysis.connecting')}</span>}
                                             {conversationState === ConversationState.Listening && <span className="text-xs text-blue-500 font-bold animate-pulse uppercase tracking-wider">Listening</span>}
                                             {conversationState === ConversationState.Replying && <span className="text-xs text-green-500 font-bold uppercase tracking-wider">Speaking</span>}
                                             {conversationState === ConversationState.Error && <span className="text-xs text-red-500 font-bold">{t('analysis.connectionError')}</span>}
                                         </div>
                                     </div>
                                     <canvas ref={visualizerCanvasRef} width="300" height="40" className="w-full max-w-md h-12 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"></canvas>
                                 </div>
                             )}
                         </div>
                     </div>
                </div>
            );
        }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
      
      {/* Page Header */}
      <div className="pt-8 px-6 pb-4 max-w-5xl mx-auto w-full animate-fade-in-up">
          <div className="flex flex-col gap-4">
              <button 
                  onClick={() => navigate('/dashboard')} 
                  className="self-start flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                  <ChevronDown className="h-5 w-5 rotate-90" /> 
                  <span className="text-sm font-medium">Back to Dashboard</span>
              </button>
              
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2 flex-grow">
                      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {session?.fileName || 'Loading...'}
                      </h1>
                      {session?.status === 'completed' && (
                          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                              {getDocumentDescription()}
                          </p>
                      )}
                  </div>
                  {session?.status === 'completed' && (
                      <div className="flex flex-row md:flex-col gap-2 flex-shrink-0 mt-1">
                          <button 
                            onClick={handleDownloadPdf}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm whitespace-nowrap"
                          >
                             <Download className="h-4 w-4" />
                             <span>{t('analysis.downloadPdf')}</span>
                          </button>
                          <button 
                             onClick={handleCopySummary}
                             className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium shadow-sm transition-colors text-sm whitespace-nowrap"
                          >
                             <ClipboardCopy className="h-4 w-4" />
                             <span>{copyStatus}</span>
                          </button>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Sticky Tabs Navigation */}
      {session?.status === 'completed' && (
        <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 mb-8 shadow-sm transition-all duration-300">
            <div className="max-w-5xl mx-auto px-6">
                <div className="flex overflow-x-auto no-scrollbar gap-2 py-3">
                    <TabButton tabName="analysis" label={t('analysis.tabAnalysis')} icon={FileText} />
                    <TabButton tabName="clauses" label={t('analysis.tabClauses')} icon={FileSearch} />
                    <TabButton tabName="risk" label={t('analysis.tabRisk')} icon={ShieldAlert} />
                    <TabButton tabName="faq" label={t('analysis.tabFaq')} icon={BookOpen} />
                    <TabButton tabName="supporting" label={t('analysis.tabSupporting')} icon={Paperclip} />
                    <TabButton tabName="chat" label={t('analysis.tabChat')} icon={MessageSquare} />
                </div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-6 pb-12 max-w-5xl mx-auto w-full animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {renderTabContent()}
      </main>
    </div>
  );
};

export default AnalysisPage;