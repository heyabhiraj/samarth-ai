import type { Auth, User, ConfirmationResult } from "firebase/auth";

// Public, non-secret config — safe to ship to the browser. It only
// identifies which Firebase project to talk to; actual security is
// enforced by our backend verifying ID tokens server-side.
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

// The Firebase SDK is ~40KB gzipped — dynamically imported here so pages
// that never touch an authenticated feature (most of the app works
// anonymously) don't pay that cost just for importing this module. It's
// fetched once, in parallel with whatever else is happening, the first time
// any exported function below actually runs.
let authPromise: Promise<Auth> | null = null;

// Last-known auth state, kept in sync by a persistent listener so
// synchronous UI (nav labels, form prefill) can read a "good enough,
// updates within milliseconds" value without every caller awaiting.
let cachedUser: User | null | undefined = undefined;

async function loadAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      const [{ initializeApp, getApps }, { getAuth, onAuthStateChanged }] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
      ]);
      const app = getApps()[0] ?? initializeApp(firebaseConfig);
      const auth = getAuth(app);
      cachedUser = null;
      onAuthStateChanged(auth, (user) => {
        cachedUser = user;
        window.dispatchEvent(new Event("kisan:auth-change"));
      });
      return auth;
    })();
  }
  return authPromise;
}

/** Best-effort synchronous check — false until the SDK has loaded once; use waitForAuthInit() when correctness matters more than instant paint. */
export function isLoggedIn(): boolean {
  void loadAuth(); // kick off loading in the background so state resolves soon
  return cachedUser !== null && cachedUser !== undefined;
}

export function getCachedUser(): User | null {
  void loadAuth();
  return cachedUser ?? null;
}

/** Resolves once Firebase has loaded and restored (or confirmed there's no) persisted session. */
export async function waitForAuthInit(): Promise<User | null> {
  const auth = await loadAuth();
  if (cachedUser !== undefined) return cachedUser;
  const { onAuthStateChanged } = await import("firebase/auth");
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/** Returns a fresh (auto-refreshed by the SDK) ID token, or null if signed out. */
export async function getIdToken(): Promise<string | null> {
  const user = await waitForAuthInit();
  return user ? user.getIdToken() : null;
}

export async function signOut(): Promise<void> {
  const [auth, { signOut: firebaseSignOut }] = await Promise.all([loadAuth(), import("firebase/auth")]);
  await firebaseSignOut(auth);
}

let recaptchaVerifier: import("firebase/auth").RecaptchaVerifier | null = null;

/** Sends an SMS OTP to `phoneNumber` (10-digit Indian number, E.164-ified here). */
export async function sendOtp(phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
  const [auth, { RecaptchaVerifier, signInWithPhoneNumber }] = await Promise.all([loadAuth(), import("firebase/auth")]);

  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: "invisible" });
  }

  return signInWithPhoneNumber(auth, `+91${phoneNumber}`, recaptchaVerifier);
}

export async function confirmOtp(confirmationResult: ConfirmationResult, code: string): Promise<User> {
  const credential = await confirmationResult.confirm(code);
  return credential.user;
}
