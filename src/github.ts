import { BASE_URL, MY_GITHUB_LOGIN_NAME } from ".";

const REDIRECT_URI = new URL("/github-oauth-callback", BASE_URL).toString();

export function getOAuthUrl(state: string, clientId: string): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", ["read:user", "read:org"].join(" "));
  url.searchParams.set("allow_signup", "true");

  return url.toString();
}

type FetchOAuthToken = {
  access_token: string;
};

export async function fetchOAuthTokens(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<FetchOAuthToken> {
  const url = "https://github.com/login/oauth/access_token";
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch(url, {
    body,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
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

// 100人以上のスポンサーしている場合，100人目以降は取得できない
const query = `
  query {
    viewer {
      sponsoring(first: 100) {
        nodes {
          ... on Organization {
            login
          }
          ... on User {
            login
          }
        }
      }
    }
  }
`;

type Query = {
  data: {
    viewer: {
      sponsoring: {
        nodes: Array<{
          login: string;
        }>;
      };
    };
  };
};

type FetchSponsoring = Array<{
  login: string;
}>;

export async function fetchSponsoring(
  accessToken: string
): Promise<FetchSponsoring> {
  console.log(accessToken);
  const url = "https://api.github.com/graphql";

  const response = await fetch(url, {
    body: JSON.stringify({ query }),
    method: "POST",
    headers: {
      "User-Agent": MY_GITHUB_LOGIN_NAME,
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.ok) {
    const data = (await response.json()) as Query;
    return data.data.viewer.sponsoring.nodes;
  } else {
    console.log(await response.text());
    throw new Error(
      `Error fetching GitHub user data: [${response.status}] ${response.statusText}`
    );
  }
}
