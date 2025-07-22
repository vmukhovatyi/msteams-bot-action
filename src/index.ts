import * as core from '@actions/core';
import axios from 'axios';

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

    core.info(`Getting Azure token...`);

    const oidcResponse = await axios.get(`${oidcUrl}&audience=api://AzureADTokenExchange`, {
      headers: { Authorization: `bearer ${oidcToken}` }
    });

    const githubToken = oidcResponse.data.value;

    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: clientId,
        client_assertion: githubToken,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        grant_type: 'client_credentials',
        scope: 'https://api.botframework.com/.default',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const azureToken = tokenResponse.data.access_token;
    core.info(`✅ Azure token obtained`);

    const response = await axios.post(
      'https://smba.trafficmanager.net/teams/v3/conversations',
      {
        isGroup: true,
        channelData: { channel: { id: channelId } },
        activity: { type: 'message', text: message }
      },
      { headers: { Authorization: `Bearer ${azureToken}` } }
    );

    core.info(`Message sent successfully! Status: ${response.status}`);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
