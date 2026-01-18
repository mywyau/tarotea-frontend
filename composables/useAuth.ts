import { createAuth0Client } from "@auth0/auth0-spa-js";

let auth0Client: Auth0Client | null = null;

export async function useAuth() {
  if (process.server) {
    return {
      client: null,
      user: null,
      isAuthenticated: false,
      getAccessToken: async () => null,
    };
  }

  const config = useRuntimeConfig();

  if (!auth0Client) {
    auth0Client = await createAuth0Client({
      domain: config.public.auth0Domain,
      clientId: config.public.auth0ClientId,
      authorizationParams: {
        redirect_uri: window.location.origin + "/callback",
        audience: useRuntimeConfig().public.auth0Audience,
      },
    });
  }

  const isAuthenticated = await auth0Client.isAuthenticated();
  const user = isAuthenticated ? await auth0Client.getUser() : null;

  async function getAccessToken() {
    return await auth0Client!.getTokenSilently();
  }

  return {
    client: auth0Client,
    isAuthenticated,
    user,
    getAccessToken,
  };
}


export async function loginWithGoogle() {
  if (!process.client) return
  const { client } = await useAuth()
  if (!client) return

  await client.loginWithRedirect({
    authorizationParams: {
      connection: 'google-oauth2'
    }
  })
}

export async function loginWithEmail() {
  if (!process.client) return;

  const { client } = await useAuth();
  if (!client) return;

  await client.loginWithRedirect();
}

export async function logout() {
  if (!process.client) return;

  const { client } = await useAuth();
  if (!client) return;

  await client.logout({
    logoutParams: {
      returnTo: window.location.origin,
    },
  });
}
