import * as core from '@actions/core';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${body}`);
  }

  return (await response.json()) as T;
}

async function run(): Promise<void> {
  try {
    const tenantId = core.getInput('tenant-id', { required: true });
    const clientId = core.getInput('client-id', { required: true });
    const channelId = core.getInput('channel-id', { required: true });
    const message = core.getInput('message', { required: true });

    const oidcToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
    const oidcUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;

    if (!oidcToken || !oidcUrl) {
      throw new Error('OIDC token or URL missing from environment.');
    }

    core.info('Getting Azure token...');

    const oidcResponse = await fetchJson<{ value: string }>(
      `${oidcUrl}&audience=api://AzureADTokenExchange`,
      {
        headers: { Authorization: `bearer ${oidcToken}` },
      },
    );

    const githubToken = oidcResponse.value;

    const tokenResponse = await fetchJson<{ access_token: string }>(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_assertion: githubToken,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          grant_type: 'client_credentials',
          scope: 'https://api.botframework.com/.default',
        }),
      },
    );

    const azureToken = tokenResponse.access_token;
    core.info('Azure token obtained');

    const response = await fetch('https://smba.trafficmanager.net/teams/v3/conversations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${azureToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isGroup: true,
        channelData: { channel: { id: channelId } },
        activity: { type: 'message', text: message },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${body}`);
    }

    core.info(`Message sent successfully! Status: ${response.status}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : `Unexpected error: ${String(error)}`;
    core.setFailed(message);
  }
}

run();
