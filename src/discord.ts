import { BASE_URL } from "./config";

const REDIRECT_URI = new URL("/discord-oauth-callback", BASE_URL).href;

export function getOAuthUrl(state: string, clientId: string): string {
  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set(
    "scope",
    ["role_connections.write", "identify"].join(" ")
  );
  url.searchParams.set("prompt", "consent");

  return url.toString();
}

type FetchOAuthToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function fetchOAuthTokens(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<FetchOAuthToken> {
  const url = "https://discord.com/api/v10/oauth2/token";
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch(url, {
    body,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (response.ok) {
    const data = await response.json();
    return data as FetchOAuthToken;
  } else {
    throw new Error(
      `Error fetching OAuth tokens: [${response.status}] ${response.statusText}`
    );
  }
}

type FetchUserData = {
  id: string;
};

export async function fetchUserData(
  accessToken: string
): Promise<FetchUserData> {
  const url = "https://discord.com/api/v10/users/@me";

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    return data as FetchUserData;
  } else {
    throw new Error(
      `Error fetching Discord user data: [${response.status}] ${response.statusText}`
    );
  }
}

export async function pushMetadata(
  accessToken: string,
  metadata: unknown,
  clientId: string
): Promise<void> {
  const url = `https://discord.com/api/v10/users/@me/applications/${clientId}/role-connection`;
  const body = {
    platform_name: "GitHub Sponsor",
    metadata,
  };
  const response = await fetch(url, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Error pushing discord metadata: [${response.status}] ${response.statusText}`
    );
  }
}
