# Reusable Login Kit

This folder keeps the login entry screen separate from the dashboard body.

## Files

- `LoginScreen.jsx`: reusable POSLAB-style login/entry UI.
- `authAdapters.js`: password-auth helper for stores that expose `auth.signInWithPassword`, `auth.signUpWithPassword`, and `read()`.

## Reuse Pattern

1. Import `LoginScreen`.
2. Pass project-specific brand text with the `brand` prop when the app is not POSLAB.
3. Pass visual content through the `visual` prop. Heavy assets such as the POSLAB 3D lanyard stay optional.
4. Pass auth behavior through `onAuthSubmit`. The screen does not know whether the backend is FastAPI, Supabase, or a future SSO bridge.
5. Keep authorization checks in the API/server. The login screen is only the entry UI.

## Slots

- `renderProfileEmojiPicker`: lets this app reuse the shared lazy emoji picker without forcing other projects to install it.
- `renderAssistantPanel`: lets this app keep the entry AI panel without coupling the login component to dashboard data.
- `visual`: lets other projects replace or remove the POSLAB lanyard.

## Minimal Use

```jsx
<LoginScreen
  accounts={accounts}
  authMessage={authMessage}
  authStatus={authStatus}
  isAuthReady={Boolean(apiBaseUrl)}
  onAuthSubmit={login}
  onEnterDashboard={enterDashboard}
  onLocalLogin={enterAsLocalUser}
/>
```
