
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useLanguage } from '../App';
import { FileText, Loader2, AlertCircle } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; }[] = [];
    const mouse = { x: -200, y: -200 };
    const interactionRadius = 250;
    const connectionDistance = 90;
    const particleSpacing = 40;

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = [];
        // Ensure we cover the entire screen by adding a buffer to the loop conditions
        for (let y = 0; y <= canvas.height + particleSpacing; y += particleSpacing) {
            for (let x = 0; x <= canvas.width + particleSpacing; x += particleSpacing) {
                particles.push({ x: x, y: y });
            }
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let opacity = 0.1;
            if (dist < interactionRadius) {
                opacity = 1 - (dist / interactionRadius);
            }
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(167, 183, 222, ${opacity})`;
            ctx.fill();

            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx2 = p.x - p2.x;
                const dy2 = p.y - p2.y;
                const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                if (dist2 < connectionDistance && dist < interactionRadius) {
                     const lineOpacity = Math.min(0.8, (1 - (dist2 / connectionDistance)) * (1 - (dist / interactionRadius)));
                     if (lineOpacity > 0) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(167, 183, 222, ${lineOpacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                     }
                }
            }
        }
        animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', resizeCanvas);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', resizeCanvas);
        cancelAnimationFrame(animationFrameId);
    };
  }, []);


  const validatePassword = (pass: string) => {
    if (pass.length < 6) return "Password must be at least 6 characters long.";
    if (!/[A-Z]/.test(pass)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(pass)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(pass)) return "Password must contain a number.";
    return null;
  };

  const mapFirebaseError = (errCode: string, originalMessage?: string) => {
      switch(errCode) {
          case 'auth/invalid-credential': return "Invalid email or password.";
          case 'auth/user-not-found': return "No user found with this email.";
          case 'auth/wrong-password': return "Incorrect password.";
          case 'auth/email-already-in-use': return "Email is already in use.";
          case 'auth/weak-password': return "Password is too weak.";
          case 'auth/invalid-email': return "Invalid email address.";
          case 'auth/popup-closed-by-user': return "Sign in was cancelled.";
          case 'auth/unauthorized-domain': return "This domain is not authorized in Firebase Console.";
          case 'auth/operation-not-allowed': return "This sign-in method is not enabled in Firebase Console.";
          default: return originalMessage || "An authentication error occurred.";
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!isLoginView) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    try {
      if (isLoginView) {
        await login(email, password);
        navigate('/dashboard', { replace: true });
      } else {
        await register(email, password);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(mapFirebaseError(err.code, err.message));
    } finally {
      setLoading(false);
    }
  };

  const PasswordRequirement: React.FC<{isValid: boolean; text: string}> = ({isValid, text}) => (
    <span className={`text-xs transition-colors ${isValid ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>{text}</span>
  );

  return (
    <div className="flex items-center justify-center min-h-screen relative bg-[#0f172a] overflow-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 z-0 opacity-50"></canvas>
      <div className="relative z-10 p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-full max-w-md animate-fade-in-up m-4">
        <div className="text-center mb-8">
          <FileText className="mx-auto h-12 w-12 text-blue-500" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-4">{t('auth.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {isLoginView ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-4 max-w-xs mx-auto leading-relaxed">
            Your AI-powered legal companion. Understand contracts, assess risks, and draft documents in seconds.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-500 dark:text-red-400 text-sm p-3 rounded-md mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-500/10 text-green-600 dark:text-green-400 text-sm p-3 rounded-md mb-4 flex items-center gap-2 border border-green-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {!isLoginView && (
            <>
              <input
                type="password"
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                  <PasswordRequirement isValid={password.length >= 6} text={t('auth.passwordRequirements.length')} />
                  <PasswordRequirement isValid={/[A-Z]/.test(password)} text={t('auth.passwordRequirements.uppercase')} />
                  <PasswordRequirement isValid={/[a-z]/.test(password)} text={t('auth.passwordRequirements.lowercase')} />
                  <PasswordRequirement isValid={/[0-9]/.test(password)} text={t('auth.passwordRequirements.number')} />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-blue-800 transition-colors flex items-center justify-center disabled:bg-blue-900/50 disabled:cursor-wait"
          >
            {loading && !successMessage && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
            {isLoginView ? t('auth.loginButton') : t('auth.createAccountButton')}
          </button>
        </form>
        
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-6">
          {isLoginView ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError('');
              setSuccessMessage('');
            }}
            className="font-semibold text-blue-500 hover:text-blue-400 ml-2"
          >
            {isLoginView ? t('auth.signUp') : t('auth.signIn')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
