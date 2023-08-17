import { Hono } from "hono";
import * as discord from "./discord";
import * as github from "./github";
import { getSignedCookie, setSignedCookie, deleteCookie } from "hono/cookie";
import { Temporal } from "@js-temporal/polyfill";
import {
  getDiscordToken,
  getDiscordUserId,
  getGitHubToken,
  putDiscordToken,
  putDiscordUserId,
  putGitHubToken,
} from "./storage";
import { registor } from "./registor";

type Env = {
  Bindings: {
    KV: KVNamespace;
    DISCORD_CLIENT_ID: string;
    DISCORD_CLIENT_SECRET: string;
    DISCORD_TOKEN: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    COOKIE_SIGN_SECRET: string;
  };
};

const app = new Hono<Env>();

app.get("/", (c) => c.text("Hello Hono!"));

app.get("/registor", async (c) => {
  await registor(c.env.DISCORD_CLIENT_ID, c.env.DISCORD_TOKEN);

  return c.text("Registor Done!");
});

app.get("/linked-role", async (c) => {
  const state = crypto.randomUUID();
  const url = discord.getOAuthUrl(state, c.env.DISCORD_CLIENT_ID);

  await setSignedCookie(c, "state", state, c.env.COOKIE_SIGN_SECRET, {
    maxAge: 60 * 5,
    secure: true,
    httpOnly: true,
  });

  return c.redirect(url);
});

app.get("/discord-oauth-callback", async (c) => {
  const query = c.req.query();
  const discordState = query["state"];
  const code = query["code"];

  if (!discordState || !code) {
    return c.text("Invalid request", 400);
  }

  const clientCookie = await getSignedCookie(
    c,
    c.env.COOKIE_SIGN_SECRET,
    "state"
  );
  if (discordState !== clientCookie) {
    return c.text("State verification failed", 403);
  }

  const tokens = await discord.fetchOAuthTokens(
    code,
    c.env.DISCORD_CLIENT_ID,
    c.env.DISCORD_CLIENT_SECRET
  );
  const userData = await discord.fetchUserData(tokens.access_token);

  const value = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Temporal.Now.instant()
      .add(Temporal.Duration.from({ seconds: tokens.expires_in }))
      .toString(),
  };
  await putDiscordToken(c.env.KV, userData.id, value);

  const state = discordState;
  await putDiscordUserId(c.env.KV, state, userData.id);

  const url = github.getOAuthUrl(state, c.env.GITHUB_CLIENT_ID);
  return c.redirect(url);
});

app.get("/github-oauth-callback", async (c) => {
  const query = c.req.query();
  const githubState = query["state"];
  const code = query["code"];

  if (!githubState || !code) {
    return c.text("Invalid request", 400);
  }

  const clientCookie = await getSignedCookie(
    c,
    c.env.COOKIE_SIGN_SECRET,
    "state"
  );
  if (githubState !== clientCookie) {
    return c.text("State verification failed", 403);
  }

  const githubToken = await github.fetchOAuthTokens(
    code,
    c.env.GITHUB_CLIENT_ID,
    c.env.GITHUB_CLIENT_SECRET
  );

  const discordUserId = await getDiscordUserId(c.env.KV, githubState);

  await putGitHubToken(c.env.KV, discordUserId, githubToken.access_token);
  await updateMetadata(c.env.KV, discordUserId, c.env.DISCORD_CLIENT_ID);

  return c.text("All Done!");
});

app.post("/update-metadata", async (c) => {
  const discordUserId = (await c.req.formData()).get("user_id");
  if (!discordUserId) {
    return c.text("Invalid request", 400);
  }

  await updateMetadata(c.env.KV, discordUserId, c.env.DISCORD_CLIENT_ID);

  return c.text("Updated!");
});

export default app;

async function updateMetadata(
  KV: KVNamespace,
  discordUserId: string,
  discordClientId: string
): Promise<void> {
  const discordToken = await getDiscordToken(KV, discordUserId);
  const githubToken = await getGitHubToken(KV, discordUserId);

  const sponsoring = await github.fetchSponsoring(githubToken);
  const isSponsoring = sponsoring.some((s) => s.login === "approvers");

  const metadata = {
    is_sponsoring: isSponsoring ? 1 : 0,
  };

  await discord.pushMetadata(
    discordToken.accessToken,
    metadata,
    discordClientId
  );
}
