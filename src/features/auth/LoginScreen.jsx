import { useEffect, useMemo, useState } from "react";
import { LogIn } from "lucide-react";

export const defaultLoginBrand = {
  ariaLabel: "POSLAB Work Hub 시작",
  kicker: "연구기획그룹-전략",
  eyebrow: "POSCO",
  title: "POSLAB",
  titleAccent: "Work Hub",
  supportingText: "함께 보는 업무, 함께 만드는 흐름, 함께 성장하는 팀",
  emailLabel: "회사 이메일",
  emailPlaceholder: "seulgis@posco.com",
  nameLabel: "이름",
  namePlaceholder: "예: 장형민",
  passwordLabel: "비밀번호",
  passwordPlaceholder: "6자 이상",
  profileEmojiLabel: "프로필 이모지",
  signinLabel: "로그인",
  signupLabel: "권한 요청",
  signupSubmitLabel: "권한 요청 보내기",
  submittingLabel: "확인 중",
  enterLabel: "대시보드로 들어가기"
};

function fallbackProfileEmojiPicker({ value, onChange }) {
  return (
    <input
      aria-label={defaultLoginBrand.profileEmojiLabel}
      className="profile-emoji-trigger"
      maxLength={4}
      onChange={(event) => onChange(event.target.value || "🌿")}
      value={value}
    />
  );
}

export function LoginScreen({
  accounts = [],
  authMessage = "",
  authStatus = "idle",
  brand = defaultLoginBrand,
  isAlreadyAuthenticated = false,
  isAuthReady = false,
  onAuthSubmit,
  onEnterDashboard,
  onLocalLogin,
  renderAssistantPanel,
  renderProfileEmojiPicker = fallbackProfileEmojiPicker,
  visual
}) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [profileEmoji, setProfileEmoji] = useState("🌿");
  const localAccounts = useMemo(() => accounts.filter(Boolean), [accounts]);
  const [selectedLocalAccountId, setSelectedLocalAccountId] = useState(() => localAccounts[0]?.id ?? "");
  const selectedLocalAccount = localAccounts.find((account) => account.id === selectedLocalAccountId) ?? localAccounts[0];
  const isSubmitting = authStatus === "submitting" || authStatus === "checking";
  const labels = { ...defaultLoginBrand, ...brand };

  useEffect(() => {
    if (!localAccounts.length) return;
    if (!localAccounts.some((account) => account.id === selectedLocalAccountId)) {
      setSelectedLocalAccountId(localAccounts[0].id);
    }
  }, [localAccounts, selectedLocalAccountId]);

  function submit(event) {
    event.preventDefault();
    if (!isAuthReady || !onAuthSubmit) return;
    onAuthSubmit({
      mode,
      email: email.trim(),
      password,
      name: name.trim() || email.split("@")[0] || "새 사용자",
      profileEmoji
    });
  }

  return (
    <main className="login-screen poslab-entry-screen">
      <div className="poslab-entry-gradient" aria-hidden="true" />
      <section className="poslab-entry-shell" aria-label={labels.ariaLabel}>
        <div className="poslab-entry-visual">
          <div className="poslab-brand-kicker">
            <span className="poslab-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>{labels.kicker}</span>
          </div>
          {visual}
        </div>

        <div className="poslab-entry-panel">
          <div className="poslab-entry-heading">
            <span className="panel-label">{labels.eyebrow}</span>
            <h1>
              <span>{labels.title}</span>
              <span className="hub-gradient-text">{labels.titleAccent}</span>
            </h1>
            <p>{labels.supportingText}</p>
          </div>

          {isAuthReady && !isAlreadyAuthenticated ? (
            <form className="auth-form poslab-auth-form" onSubmit={submit}>
              <div className="auth-mode-tabs" role="tablist" aria-label="로그인 방식">
                <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">
                  {labels.signinLabel}
                </button>
                <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
                  {labels.signupLabel}
                </button>
              </div>

              {mode === "signup" && (
                <label className="auth-field">
                  <span>{labels.nameLabel}</span>
                  <input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder={labels.namePlaceholder} value={name} />
                </label>
              )}

              <label className="auth-field">
                <span>{labels.emailLabel}</span>
                <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder={labels.emailPlaceholder} type="email" value={email} />
              </label>

              <label className="auth-field">
                <span>{labels.passwordLabel}</span>
                <input autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} onChange={(event) => setPassword(event.target.value)} placeholder={labels.passwordPlaceholder} type="password" value={password} />
              </label>

              {mode === "signup" && (
                <div className="auth-emoji-row">
                  <span>{labels.profileEmojiLabel}</span>
                  {renderProfileEmojiPicker({ value: profileEmoji, onChange: setProfileEmoji })}
                </div>
              )}

              {authMessage && <p className="auth-message">{authMessage}</p>}

              <button className="primary-button auth-submit poslab-enter-button" disabled={isSubmitting || !email.trim() || !password} type="submit">
                <LogIn size={17} />
                {isSubmitting ? labels.submittingLabel : mode === "signup" ? labels.signupSubmitLabel : labels.signinLabel}
              </button>
            </form>
          ) : (
            <div className="poslab-local-entry">
              <button
                className="primary-button poslab-enter-button"
                disabled={!isAlreadyAuthenticated && !selectedLocalAccount}
                onClick={() => {
                  if (isAlreadyAuthenticated) {
                    onEnterDashboard?.();
                    return;
                  }
                  if (selectedLocalAccount) onLocalLogin?.(selectedLocalAccount.id);
                }}
                type="button"
              >
                <LogIn size={17} />
                {labels.enterLabel}
              </button>
            </div>
          )}

          {(!isAuthReady || isAlreadyAuthenticated) && renderAssistantPanel?.({ selectedLocalAccount })}
        </div>
      </section>
    </main>
  );
}
