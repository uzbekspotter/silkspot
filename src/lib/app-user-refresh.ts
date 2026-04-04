/** Dispatched so App can refetch navbar user (rank, role, avatar) from DB. */
export const REFRESH_APP_USER_EVENT = 'silkspot:refresh-app-user';

export function dispatchRefreshAppUser(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(REFRESH_APP_USER_EVENT));
}
