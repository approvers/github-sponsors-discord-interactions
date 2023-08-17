export async function registor(clientId: string, token: string): Promise<void> {
  const url = `https://discord.com/api/v10/applications/${clientId}/role-connections/metadata`;
  const body = [
    {
      key: "is_sponsoring",
      name: "Sponsoring me",
      description: "Is sponsoring me on GitHub",
      type: 7,
    },
  ];

  const response = await fetch(url, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    console.log(data);
  } else {
    throw new Error(
      `Error pushing discord metadata schema: [${response.status}] ${response.statusText}`
    );
  }
}
