# Fix Dialogflow CX Permission Issues

## Problem
Your service account doesn't have the required permissions to access Dialogflow CX. The error shows:
```
IAM permission 'dialogflow.sessions.detectIntent' on 'projects/hellas-direct-chat-v1/locations/global/agents/36773d7c-2d3b-4098-90e7-949b09888b2b' denied.
```

## Solution Steps

### 1. Add Required IAM Roles to Service Account

Go to Google Cloud Console IAM and add these roles to your service account:

**Required Roles for Dialogflow CX:**
- `Dialogflow API Client` (roles/dialogflow.client)
- `Dialogflow API Admin` (roles/dialogflow.admin) - **Recommended for full access**

**Steps:**
1. Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam?project=hellas-direct-chat-v1)
2. Find your service account (likely `nextappkey@hellas-direct-chat-v1.iam.gserviceaccount.com`)
3. Click the edit icon (pencil)
4. Click "ADD ANOTHER ROLE"
5. Search for and add: `Dialogflow API Admin`
6. Click "SAVE"

### 2. Alternative: Use gcloud CLI

If you prefer command line, run these commands:

```powershell
# Set your project
gcloud config set project hellas-direct-chat-v1

# Add Dialogflow Admin role to your service account
gcloud projects add-iam-policy-binding hellas-direct-chat-v1 `
  --member="serviceAccount:nextappkey@hellas-direct-chat-v1.iam.gserviceaccount.com" `
  --role="roles/dialogflow.admin"

# Verify the binding
gcloud projects get-iam-policy hellas-direct-chat-v1 `
  --flatten="bindings[].members" `
  --format="table(bindings.role)" `
  --filter="bindings.members:*nextappkey*"
```

### 3. Verify Required APIs are Enabled

Make sure these APIs are enabled in your project:

```powershell
# Enable Dialogflow API
gcloud services enable dialogflow.googleapis.com

# Enable Cloud Resource Manager API
gcloud services enable cloudresourcemanager.googleapis.com

# List enabled APIs to verify
gcloud services list --enabled --filter="name:dialogflow"
```

### 4. Test the Fix

After adding the roles, restart your development server and test:

```powershell
# Stop the current dev server (Ctrl+C)
# Then restart
pnpm dev
```

## Common Dialogflow CX Roles

| Role | Purpose | Permissions |
|------|---------|-------------|
| `Dialogflow API Client` | Basic access to detect intents | `dialogflow.sessions.detectIntent` |
| `Dialogflow API Admin` | Full access including management | All Dialogflow permissions |
| `Dialogflow Console Agent Editor` | Console access for editing | Agent editing in console |

## Troubleshooting

### If you still get permission errors:

1. **Check the exact service account email**:
   ```powershell
   # View service account details from your key file
   Get-Content "hellas-direct-chat-0b058c48395a.json" | ConvertFrom-Json | Select-Object client_email
   ```

2. **Verify the project ID matches**:
   - Your `.env` shows: `hellas-direct-chat-v1`
   - Make sure this matches your Google Cloud project

3. **Check agent ownership**:
   - Ensure the Dialogflow CX agent belongs to the same project
   - Agent ID: `36773d7c-2d3b-4098-90e7-949b09888b2b`

### Alternative: Create a new service account with proper permissions

If the current service account is problematic, create a new one:

1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=hellas-direct-chat-v1)
2. Click "CREATE SERVICE ACCOUNT"
3. Name: `dialogflow-admin`
4. Add roles: `Dialogflow API Admin`
5. Create and download new JSON key
6. Update your `.env` file with the new key path

## Next Steps

Once permissions are fixed, your application should work properly with Dialogflow CX.
