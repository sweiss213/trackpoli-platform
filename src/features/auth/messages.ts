// Display strings for the sign-in screens. Client-safe (no server imports) and kept in one place so the
// copy matches the design and is straightforward to localise later (next-intl). The generic error never
// reveals which credential was wrong or whether the email exists (ADR-0005).

export const SIGN_IN_MESSAGES = {
  genericError: "The email or password you entered is incorrect.",
  verificationNeeded: "Please complete the verification and try again.",
  rateLimited: "Too many attempts. Please wait and try again.",
  attemptsRemaining: (n: number) =>
    `${n} ${n === 1 ? "attempt" : "attempts"} remaining before this account is temporarily locked.`,
} as const;

// Password-recovery copy (ADR-0008). The request acknowledgement is deliberately the same whether or not an
// account exists, so it never reveals which emails are registered. Final visual copy is reconciled with the
// recovery-screen designs; these strings keep the backend flow usable and enumeration-safe in the meantime.
export const PASSWORD_RESET_MESSAGES = {
  requestAcknowledged:
    "If an account exists for that email, we've sent a link to reset the password. Check your inbox.",
  verificationNeeded: "Please complete the verification and try again.",
  rateLimited: "Too many requests. Please wait and try again.",
  linkExpired: "This password reset link is invalid or has expired. Please request a new one.",
  weakPassword: "Please choose a password with at least 12 characters.",
  genericError: "Something went wrong. Please try again.",
  resetComplete: "Your password has been reset. Please sign in with your new password.",
} as const;

// Two-factor copy (ADR-0009). Code errors never say whether the code was wrong vs expired — just that it
// did not match — and never reveal anything about the account. Final visual copy is reconciled with the
// enrolment and code-entry designs; these keep the flow usable in the meantime.
export const MFA_MESSAGES = {
  invalidCode: "That code didn't match. Check your authenticator app and try again.",
  invalidCurrentCode: "That code from your current device didn't match. Try again.",
  tooManyAttempts: "Too many incorrect codes. For your security, this has been paused. Try again later.",
  reauthFailed: "We couldn't confirm it's you. Please try again.",
  noFactor: "Something went wrong setting up two-factor. Please sign in again.",
  genericError: "Something went wrong. Please try again.",
  enrolIntro: "Scan this code with an authenticator app, then enter the 6-digit code to finish setup.",
  verifyIntro: "Enter the 6-digit code from your authenticator app to finish signing in.",
  verifyRecoveryHelp: "Lost access to your authenticator? An Admin Manager will need to re-create your account.",
} as const;

// Forced first-time enrolment copy (ADR-0009, Figma node 1293:2729). The enrol screens are the aal1 gate a
// new administrator hits before any data route; the copy matches the design, with the account-recovery line
// pointing at the manager-recreate path (never a self-service bypass).
export const MFA_ENROL_MESSAGES = {
  // Instructions
  title: "Set up two-step verification",
  intro:
    "Two-step verification is required for every TrackPoli Admin account. You'll use an authenticator app to approve each sign-in.",
  step1: "Install an authenticator app, such as Google Authenticator, Microsoft Authenticator or Authy.",
  step2: "Scan the TrackPoli QR code, or enter the setup key by hand.",
  step3: "Enter the 6-digit code your app shows to finish turning it on.",
  gateNote: "You can't access the TrackPoli Admin Dashboard until two-step verification is set up.",
  // Scan / manual key
  scanTitle: "Scan the QR code",
  scanBody: "Open your authenticator app, add an account and scan this code. Then enter the 6-digit code it shows.",
  enterKeyLink: "Can't scan? Enter a key instead",
  manualTitle: "Enter the key manually",
  manualBody:
    "In your authenticator app choose “Enter a setup key”, then type or paste this key. Select time-based if asked.",
  keyLabel: "Setup key",
  copyKey: "Copy key",
  copied: "Copied",
  scanInsteadLink: "Scan the QR code instead",
  // Enter code
  codeTitle: "Enter the 6-digit code",
  codeBody: "Enter the code your authenticator app shows for TrackPoli Admin to finish setting up.",
  verifyButton: "Verify and turn on",
  backToQr: "Back to QR code",
  wrongCode: "That code isn't right. Check your app and try again.",
  // Too many attempts
  pausedTitle: "Setup temporarily paused",
  pausedBody: "Too many incorrect codes. For your security, setup has been paused for this account.",
  pausedRetry: "Try again later.",
  pausedHelp: "If you believe this is a mistake, contact an Admin manager.",
  // Setup could not start
  failedTitle: "We couldn't start setup",
  failedBody: "Something went wrong while creating your setup code. Nothing has changed on your account.",
  tryAgain: "Try again",
  failedHelp: "If this keeps happening, contact an Admin manager.",
  // Setup session expired (signed out mid-enrolment)
  sessionExpiredTitle: "Your setup session expired",
  sessionExpiredBody:
    "You were signed out after a period of inactivity before two-step verification was finished. Sign in again to continue.",
  signInAgain: "Sign in again",
  sessionExpiredNote: "Nothing was changed on your account.",
  // Success
  successTitle: "Two-step verification is on",
  successBody: "From now on you'll enter a code from your authenticator app each time you sign in.",
  successRecovery: "Lost your phone? An Admin manager will need to re-create your account.",
  goToDashboard: "Go to dashboard",
  // Shared
  continueButton: "Continue",
  signOut: "Sign out",
  back: "Back",
} as const;

// Safe-sessions copy (TP1-05, ADR-0010; Figma 1211:2489 session-expired + 1396:175539 warning dialogs). Two
// warning dialogs: the idle one is extendable ("Stay signed in"); the 4-hour one is a hard cap and cannot be
// extended ("Sign in again"). The minute figure in a title tracks the configured warning lead, and the live
// countdown in the note is formatted as m:ss. The expired-screen footnote states the 15-minute idle policy
// (Q-1-02), correcting the design's placeholder "30 minutes".
export const SESSION_MESSAGES = {
  // Idle warning — extendable
  idleTitle: (mins: number) => `You will be signed out in ${mins} ${mins === 1 ? "minute" : "minutes"}`,
  idleBody: "You've been inactive for a while. For your security, we'll sign you out when the time runs out.",
  idleNoteBody:
    "Choose Stay signed in to keep working. If you do nothing, you'll need to sign in again and unsaved changes will be lost.",
  staySignedIn: "Stay signed in",
  signOut: "Sign out",
  // 4-hour absolute warning — not extendable
  absoluteTitle: (mins: number) => `Your session ends in ${mins} ${mins === 1 ? "minute" : "minutes"}`,
  absoluteBody:
    "For your security, a session lasts at most 4 hours. Staying active doesn't extend it, so you'll need to sign in again.",
  absoluteNoteBody: "Save your work now. After you sign in again, you'll come back to this page.",
  dismiss: "Dismiss",
  signInAgain: "Sign in again",
  noteTitle: (clock: string) => `Time left: ${clock}`,
  // Session-expired screen (the page the browser lands on after a timeout)
  expiredIdleTitle: "Your session has expired",
  expiredIdleBody: "You were signed out after a period of inactivity. Sign in again to return to the console.",
  expiredAbsoluteTitle: "Your session has ended",
  expiredAbsoluteBody: "Your session reached its 4-hour limit. Sign in again to return to the console.",
  expiredFootnote: "Admin sessions end automatically after 15 minutes of inactivity to protect political data.",
  // Active sessions card — the bulk "sign out other sessions" action
  activeSessionsTitle: "Active sessions",
  thisDevice: "This device",
  signOutEverywhereTitle: "Sign out everywhere else",
  signOutEverywhereBody: "Ends all sessions except this one.",
  signOutOthers: "Sign out other sessions",
  signOutOthersBusy: "Signing out…",
  signedOutOthers: "Signed out of your other sessions.",
  signOutOthersError: "We couldn't sign out the other sessions. Please try again.",
} as const;

// Device-replacement copy (ADR-0009, Figma 1296:85823 / 1296:89239). The replacement runs in a Security-tab
// modal; re-auth is password or Google by account type. A lost device is never self-service — the copy
// points at the manager-recreate path (role-aware for managers).
export const MFA_REPLACE_MESSAGES = {
  cardTitle: "Two-factor authentication",
  cardStatus: "On — a code from your authenticator app is required every time you sign in.",
  cardNote:
    "Two-factor is mandatory and cannot be turned off. Moving to a new phone? Replace your device below — you'll confirm it's you and enter a code from your current device first.",
  replaceButton: "Replace device",
  // Intro — overview before step 1
  introTitle: "Replace your authenticator device",
  introBody: "You'll need your current device and your new device. This takes about two minutes.",
  introStep1:
    "Confirm it's you with your password, or by re-authenticating with Google, and a code from your current device.",
  introStep2: "Scan a QR code with the authenticator app on your new device, or enter the key.",
  introStep3: "Enter the 6-digit code from your new device to finish.",
  introReassureTitle: "Your current device stays active",
  introReassure: "It is removed only after the new device is confirmed.",
  getStarted: "Get started",
  // Step 1 — confirm it's you
  step1Title: "Replace your authenticator device",
  step1PasswordIntro:
    "Confirm it's you before adding a new device. Your current device keeps working until the new one is confirmed.",
  step1GoogleIntro:
    "Confirm it's you before adding a new device. Re-authenticate with Google, then enter a code from your current device. Your current device keeps working until the new one is confirmed.",
  passwordLabel: "Current password",
  passwordPlaceholder: "Enter current password",
  googleAccountLabel: "Google account",
  reauthGoogle: "Re-authenticate with Google",
  reauthedGoogle: "Re-authenticated with Google",
  currentCodeLabel: "Code from your current device",
  lostLink: "I don't have my current device",
  reauthFailed: "We couldn't confirm it's you. Please try again.",
  googleNotCompleted: "Google sign-in wasn't completed. Please try again.",
  googleMismatch: "That was a different Google account. Sign in with the account for this profile.",
  wrongCurrentCode: "That code from your current device isn't correct. Try again.",
  // Step 2 — add the new device
  step2Title: "Add your new device",
  step2Body: "In your authenticator app, add a new account and scan this code, or enter the key by hand.",
  // Step 3 — confirm the new device
  step3Title: "Enter the code from your new device",
  step3Body: "Enter the 6-digit code your new authenticator shows to finish replacing the device.",
  replaceConfirm: "Replace device",
  wrongNewCode: "That code isn't right. Check your new device and try again.",
  // Outcomes
  pausedTitle: "Too many attempts",
  pausedBody: "Too many incorrect codes. For your security, this has been paused. Try again later.",
  failedTitle: "We couldn't replace your device",
  failedBody: "Something went wrong and nothing has changed. Your current device still works.",
  successTitle: "Authenticator device replaced",
  successBody: "Your old device no longer works. Use your new device the next time you sign in.",
  // Lost device
  lostTitle: "Can't use your current device?",
  lostBodyAdmin:
    "You can only replace a device while you still have the current one. If it's lost, broken or reset, an Admin manager must re-create your account.",
  lostBodyManager:
    "You can only replace a device while you still have the current one. If it's lost, broken or reset, another Admin manager must re-create your account.",
  lostNextAdminTitle: "What happens next",
  lostNextAdmin:
    "An Admin manager re-creates your account with the same email, name and role. You'll get a new invite and set up two-step verification again. Your history stays readable.",
  lostNextManagerTitle: "If you're the only Admin manager",
  lostNextManager:
    "An account can't be re-created from the app. Follow the recovery runbook with two people present.",
  // Shared
  cancel: "Cancel",
  continueButton: "Continue",
  close: "Close",
  back: "Back",
} as const;
