# Microsoft Teams Bot Action for GitHub

This GitHub Action allows you to send proactive messages to a Microsoft Teams channel via the Bot Framework API. It is especially useful for CI/CD pipelines or any automated process where you want to notify your team directly in Teams.

---

## Dependencies & Setup

To use this GitHub Action, you must configure several Microsoft Azure and Teams components:

### 1. Azure App Registration

- Go to [Azure Portal](https://portal.azure.com) → "App registrations"
- Create a new application, or request it to be registred for you (depending on your org. setup and prcesses)
- Mark down for later:
  - `Application (client) ID`
  - `Directory (tenant) ID`

### 2. Microsoft Bot Service

- TODO: Create this part after trying IAC way

### 3. Add Bot to Teams

- Add the bot to your Team manually via Microsoft Teams UI
- Once added to the Team, it can send messages to **any channel** without requiring any api permissions set at Entra ID
- TODO: this section has to be explaned better

### 4. Federated Credentials (GitHub OIDC)

Go to your App Registration → "Certificates & secrets" → "Federated credentials":

- Federated credential scenario: Other issuer
- Issuer: `https://token.actions.githubusercontent.com`
- Audience: already preset but make sure it's this **api://AzureADTokenExchange**
- Value: **Claims matching expression**, you can use a filtered expression like:

```
claims['sub'] matches 'repo:your-org/team-repo-prefix-*:ref:refs/heads/*'
```

This allows any repo and each branch of that repo under your org and prefixed with `team-repo-prefix-` to use this token.

---

## Token Authentication Note

GitHub’s federated tokens cannot be exchanged via standard OBO (on-behalf-of) flows due to Microsoft restrictions.

Instead, we use a workaround via **JWT assertion** flow to authenticate using GitHub-issued identity token.

---

## Required Repository Secrets

| Secret Name        | Description                                       |
| ------------------ | ------------------------------------------------- |
| `AZURE_CLIENT_ID`  | Client ID of your Azure App registration          |
| `AZURE_TENANT_ID`  | Tenant ID of your Azure directory                 |
| `TEAMS_CHANNEL_ID` | Channel ID in Microsoft Teams to send messages to |

---

## Inputs

This action accepts the following inputs:

| Input        | Description                    | Required |
| ------------ | ------------------------------ | -------- |
| `message`    | Message text to post to Teams  | Yes      |
| `tenant-id`  | Your bot's app teant id        | Yes      |
| `client-id`  | Your bot's app client id       | Yes      |
| `channel-id` | MS Teams channel id to send to | Yes      |

---

## Example Usage

```yaml
name: Send Teams Message via Action

on:
  workflow_dispatch:
    inputs:
      message:
        description: 'Message to send'
        required: true
        default: 'Testing ms teams message send action from external repo'

jobs:
  notify-teams:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Use Action to Send Message
        uses: vmukhovatyi/msteams-bot-action@main
        with:
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          channel-id: ${{ secrets.TEAMS_CHANNEL_ID }}
          message: ${{ github.event.inputs.message }}
```

---

## 💙 P.S.

This project was made by people who stand with Ukraine.
Unlike a certain inhuman beings in the Kremlin and their followers who only know how to bomb, lie, and poison — we build open-source tools to connect, help, and empower.

Glory to Ukraine 🇺🇦
