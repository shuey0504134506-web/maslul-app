import { useState } from 'react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/services/auth/authService';

/**
 * הערה חשובה לגבי offline: ההתחברות הראשונה דורשת רשת (זו מגבלה טבעית
 * של אימות מול שרת). לאחר ההתחברות הראשונה, Firebase Auth שומר את
 * הסשן מקומית באופן אוטומטי - כך שפתיחות חוזרות של האפליקציה, גם
 * ללא אינטרנט, יזהו את המשתמש כמחובר וייתנו גישה מיידית לנתונים המקומיים.
 */
export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!navigator.onLine) {
      setError('התחברות ראשונה דורשת חיבור לאינטרנט. אנא התחברו לרשת ונסו שוב.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    if (!navigator.onLine) {
      setError('התחברות ראשונה דורשת חיבור לאינטרנט. אנא התחברו לרשת ונסו שוב.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sand-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-honey/15 text-2xl">
            🌿
          </div>
          <h1 className="font-display text-3xl text-ink">מסלול</h1>
          <p className="mt-1 text-ink-soft">המסע המשפחתי שלכם, מתועד ושמור</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="השם שלכם"
              required
              className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink placeholder:text-ink-soft/60 focus:border-honey"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל"
            required
            className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink placeholder:text-ink-soft/60 focus:border-honey"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            required
            minLength={6}
            className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-ink placeholder:text-ink-soft/60 focus:border-honey"
          />

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-honey py-3.5 font-medium text-white transition hover:bg-honey-dark disabled:opacity-40"
          >
            {isSubmitting ? 'רגע...' : mode === 'signup' ? 'יצירת חשבון' : 'התחברות'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-ink-soft">
          <div className="h-px flex-1 bg-sand-300" />
          או
          <div className="h-px flex-1 bg-sand-300" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={isSubmitting}
          className="w-full rounded-full border border-sand-300 bg-white py-3.5 font-medium text-ink transition hover:bg-sand-100 disabled:opacity-40"
        >
          המשך עם Google
        </button>

        <button
          onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
          className="mt-6 w-full text-center text-sm text-honey-dark"
        >
          {mode === 'signin' ? 'משתמשים חדשים - יצירת חשבון' : 'כבר יש לכם חשבון? התחברות'}
        </button>
      </div>
    </div>
  );
}

function translateAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'כתובת האימייל כבר רשומה במערכת. נסו להתחבר במקום.',
    'auth/invalid-email': 'כתובת האימייל אינה תקינה.',
    'auth/weak-password': 'הסיסמה חייבת להכיל לפחות 6 תווים.',
    'auth/wrong-password': 'סיסמה שגויה.',
    'auth/user-not-found': 'לא נמצא חשבון עם האימייל הזה.',
    'auth/invalid-credential': 'פרטי ההתחברות שגויים.',
    'auth/too-many-requests': 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.'
  };
  return map[code] ?? 'משהו השתבש. נסו שוב.';
}
