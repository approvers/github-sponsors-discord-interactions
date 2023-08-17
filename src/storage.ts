type DiscordToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export async function putDiscordToken(
  KV: KVNamespace,
  discordUserId: string,
  value: DiscordToken
): Promise<void> {
  const key = `discord:${discordUserId}`;

  await KV.put(key, JSON.stringify(value));
}

export async function getDiscordToken(
  KV: KVNamespace,
  discordUserId: string
): Promise<DiscordToken> {
  const key = `discord:${discordUserId}`;

  const value = await KV.get(key);
  if (value === null) {
    throw new Error("Invalid discord user id");
  }

  return JSON.parse(value);
}

export async function putGitHubToken(
  KV: KVNamespace,
  discordUserId: string,
  value: string
): Promise<void> {
  const key = `github:${discordUserId}`;

  await KV.put(key, value);
}

export async function getGitHubToken(
  KV: KVNamespace,
  discordUserId: string
): Promise<string> {
  const key = `github:${discordUserId}`;

  const value = await KV.get(key);
  if (value === null) {
    throw new Error("Invalid discord user id");
  }

  return value;
}

export async function putDiscordUserId(
  KV: KVNamespace,
  state: string,
  discordUserId: string
): Promise<void> {
  const key = `state:${state}`;

  await KV.put(key, discordUserId, {
    expirationTtl: 60 * 5,
  });
}

export async function getDiscordUserId(
  KV: KVNamespace,
  state: string
): Promise<string> {
  const key = `state:${state}`;

  const value = await KV.get(key);
  if (value === null) {
    throw new Error("Invalid state");
  }

  return value;
}
