export async function authenticateWithDashboardStore({
  applySnapshot,
  dashboardStore,
  isReady,
  onHydrated,
  payload,
  setAuthMessage,
  setAuthStatus,
  setIsAuthenticated,
  signupSuccessMessage = "회원가입 요청이 완료됐습니다. 이메일 확인이 켜져 있다면 메일 인증 후 로그인해 주세요.",
  snapshotOptions = { preservePrototypeTasks: true }
}) {
  if (!isReady || !dashboardStore?.auth) return false;
  setAuthStatus("submitting");
  setAuthMessage("");

  try {
    if (payload.mode === "signup") {
      await dashboardStore.auth.signUpWithPassword({
        email: payload.email,
        password: payload.password,
        name: payload.name,
        profileEmoji: payload.profileEmoji
      });
      setAuthMessage(signupSuccessMessage);
    } else {
      await dashboardStore.auth.signInWithPassword(payload.email, payload.password);
    }

    const snapshot = await dashboardStore.read();
    if (snapshot?.isAuthenticated) {
      applySnapshot(
        {
          ...snapshot,
          activePage: snapshot.activePage || "team",
          activeView: snapshot.activeView || "board"
        },
        snapshotOptions
      );
      setIsAuthenticated(true);
      setAuthStatus("signed-in");
      onHydrated?.();
      return true;
    }

    setIsAuthenticated(false);
    setAuthStatus("signed-out");
    return false;
  } catch (error) {
    setIsAuthenticated(false);
    setAuthStatus("signed-out");
    setAuthMessage(error.message || "로그인 처리 중 문제가 생겼습니다.");
    return false;
  }
}
