// Thin wrapper around utils/firebase.ts so the rest of the app doesn't need
// to know Firebase is the auth provider — just "logged in or not" and
// "give me a token for this request."
export { isLoggedIn, getIdToken, signOut, waitForAuthInit, getCachedUser } from "@/utils/firebase";
