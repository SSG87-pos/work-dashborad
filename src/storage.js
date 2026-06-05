export const dashboardStorageKey = "research-strategy-dashboard:v1";

export function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const localDashboardStore = {
  canUse: canUseBrowserStorage,
  read: readDashboardState,
  write: writeDashboardState,
  clear: clearDashboardState
};

export function readDashboardState() {
  if (!canUseBrowserStorage()) return {};
  try {
    const raw = window.localStorage.getItem(dashboardStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("저장된 대시보드 상태를 불러오지 못했습니다.", error);
    return {};
  }
}

export function writeDashboardState(state) {
  if (!canUseBrowserStorage()) return false;
  try {
    window.localStorage.setItem(dashboardStorageKey, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn("대시보드 상태를 저장하지 못했습니다.", error);
    return false;
  }
}

export function clearDashboardState() {
  if (!canUseBrowserStorage()) return false;
  window.localStorage.removeItem(dashboardStorageKey);
  return true;
}
