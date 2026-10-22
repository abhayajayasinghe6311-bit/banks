# Study Garden — enable individual accounts and real-time cloud sync

The app works in guest mode without Firebase. The account button and cloud integration are staged in the `feature/individual-cloud-sync` branch. Do **not** merge this branch as "live cloud sync" until the Firebase project, rules, and test accounts have been configured.

## Owner setup (about 10–20 minutes)

1. Open https://console.firebase.google.com/ and create a Firebase project for Study Garden. Choose the region deliberately; migrating Firestore regions later is not automatic.
2. In Project settings → General → Your apps, **add a Web app** (the </> icon). Copy its public `firebaseConfig` object. Replace the `null` in `cloud-config.js` with it, keeping the assignment:
   ```js
   window.SPAW_FIREBASE_CONFIG = {
     apiKey: "YOUR_PUBLIC_WEB_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     appId: "1:...:web:...",
     messagingSenderId: "..."
   };
   ```
   Firebase web-app config contains public identifiers, not a service-account secret. Never upload service-account JSON, private keys or passwords.
3. Authentication → Sign-in method: enable **Google** (choose a support email) and **Email/Password**.
4. Authentication → Settings → Authorized domains: add `abhayajayasinghe6311-bit.github.io`. For local testing, also allow `localhost` if needed. Do not add arbitrary wildcard domains.
5. Firestore Database: create a database in production mode, then paste the contents of `firestore.rules` into the **Rules** editor and publish those rules. Never use allow-all test rules on a public site.
6. Push the configured `cloud-config.js`, test via a preview branch, then merge to `main` to publish on GitHub Pages. Check the Firebase console for usage, quotas, and any billing requirements.

## Verification checklist

- Open the site in two browsers or devices. Sign into the **same account** on both; answer a question on device A and confirm that its result and wrong-answer count appear on device B.
- Sign out on device B, then sign in with a **different account**. Confirm that it cannot see device A's progress.
- Complete different questions while both devices are signed into the same account; verify both answers persist, even if the saves happen nearly simultaneously.
- Put device A offline; answer a question. It should show a pending sync and retain the answer locally. Reconnect and confirm it arrives on device B.
- Import guest progress from a browser that has old local answers. Confirm existing account answers are retained and new ones imported. The original guest copy remains available when signed out.
- Reset one bank and confirm the reset propagates to the other device. Restore with the existing JSON backup feature if needed.
- Test account creation, sign-in, Google popup, password reset, signout, and mobile layouts.
- Test security rules using two different signed-in Firebase users: `users/USER_A/progress/main` must be denied to `USER_B`.

## Design notes

- Per-user document path: `users/{uid}/progress/main`.
- Firebase Authentication manages account identities and passwords. Study Garden does not store passwords.
- Progress is also cached in per-account browser storage so the same browser doesn't mix users.
- A change queue on the device retries on reconnection. Each Firestore transaction updates only the changed answer/review/bookmark entries within the user's document, so simultaneous devices do not overwrite unrelated questions. If different devices answer the **same question**, the first committed answer is retained.
- The stored progress includes bank answers, wrong-answer review, bookmarks, and mixed-practice session.
- Firestore documents must stay below the provider's per-document size limit. The current question banks are expected to fit, but check real-world data sizes before expanding significantly.
- Firebase has quota and usage constraints. This integration is *not* a scheduled medical-guideline updater and does not alter any MCQ content.
- If Firebase has not been configured, guest mode remains fully available and no cloud account can be created.
