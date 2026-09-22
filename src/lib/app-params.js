// Supabase manages session storage and refresh internally, so there is no
// equivalent synchronous token check worth reading here. This truthy
// sentinel lets AuthContext ask the API for the current user, which is the
// source of truth and resolves to "not authenticated" without a session.
export const appParams = {
	appId: undefined,
	token: 'supabase-session',
	functionsVersion: undefined,
	appBaseUrl: undefined,
}
