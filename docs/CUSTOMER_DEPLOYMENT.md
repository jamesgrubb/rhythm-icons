# Rhythm Icons Add-in - Deployment Guide for IT Administrators

## Overview

This guide explains how to deploy the Rhythm Icons Library add-in to your organization using Microsoft 365 Admin Center (Centralized Deployment). This method allows you to deploy the add-in to specific users, groups, or your entire organization without requiring individual installations.

## Prerequisites

Before you begin, ensure you have:

- **Microsoft 365 Admin Access**: You must be a Global Administrator or Exchange Administrator
- **User Licenses**: Users must have Word and/or PowerPoint licenses (Office 365 E3/E5, Microsoft 365 Business, etc.)
- **Browser**: Microsoft Edge, Chrome, Safari, or Firefox (latest version recommended)

## Installation Methods

Microsoft Office Add-ins can be deployed in two ways:

### Method 1: Centralized Deployment (Recommended)

This is the official Microsoft-supported method for enterprise deployments. Benefits include:

- ✅ Automatic installation for assigned users
- ✅ Centralized management and updates
- ✅ Support for user/group targeting
- ✅ No user action required (add-in appears automatically)

### Method 2: Manual Sideloading (Testing Only)

For pilot testing or individual user installations:

- ⚠️ Requires manual installation by each user
- ⚠️ Not suitable for organization-wide deployment
- ⚠️ No centralized management

**This guide covers Method 1 (Centralized Deployment) for production use.**

---

## Step-by-Step Deployment Guide

### Step 1: Download the Manifest File

The manifest file defines the add-in configuration and is required for deployment.

**Download Link:** [manifest.production.xml](https://rhythm-icons-production.up.railway.app/manifest.xml)

Save this file to your computer. You'll upload it in the next step.

### Step 2: Access Microsoft 365 Admin Center

1. Open your browser and navigate to: [https://admin.microsoft.com](https://admin.microsoft.com)
2. Sign in with your administrator account
3. You should see the Microsoft 365 admin center dashboard

### Step 3: Navigate to Add-ins Management

1. In the left navigation pane, click **Settings**
2. Click **Integrated apps**
3. Click the **Add-ins** tab
4. Click **Deploy Add-in** button (top right)

### Step 4: Upload the Manifest

1. In the deployment dialog, select **Upload custom apps**
2. Choose **I have a manifest file (XML)**
3. Click **Browse** and select the `manifest.production.xml` file you downloaded
4. Click **Upload**

The system will validate the manifest file. If successful, you'll see the add-in details:
- **Name:** Rhythm Icons Library
- **Provider:** Spectrum Science Communications, LLC
- **Hosts:** Word, PowerPoint

### Step 5: Assign Users

Choose who will have access to the add-in:

**Option A: Everyone in the organization (Recommended for company-wide deployment)**
- Select **Everyone**
- All current and future users will automatically get the add-in

**Option B: Specific users/groups**
- Select **Specific users/groups**
- Search for and select users or groups (e.g., "Marketing Team", "Sales Department")
- You can add multiple users and groups

**Option C: Just me (Testing only)**
- Select **Just me**
- Only your admin account will have access

### Step 6: Configure Deployment Settings

1. **Deployment type**: Select **Available to everyone** (default - appears in Add-ins menu)
   - Alternative: **Optional** (users can choose to enable)
   - Alternative: **Fixed** (users cannot disable)

2. **Manifest source**: Keep as **Uploaded file**

3. Click **Deploy** to begin deployment

### Step 7: Confirm Deployment

You'll see a confirmation message:
- ✅ "Rhythm Icons Library has been deployed"
- The add-in will appear in the Integrated apps list

**Important:** It can take up to **24 hours** for the add-in to appear for all users. In most cases, it takes 1-4 hours.

---

## User Access & First-Time Sign-In

### What Users Will See

Once deployed, users will see the add-in in their Office applications:

1. **In Word/PowerPoint:**
   - A new "Rhythm Icons" button appears in the **Insert** tab
   - OR users can find it under **Insert → Add-ins → My Add-ins**

2. **First Launch:**
   - User clicks the "Insert Icon" button
   - A taskpane opens on the right side of the document
   - User is prompted to **Sign in with Microsoft**

### Azure AD Consent (First-Time Only)

When users first sign in, they'll see an Azure AD consent prompt asking for permission to:

- **Read your profile information**
- **Access icons on your behalf**

This is a standard OAuth consent flow. Users must click **Accept** to use the add-in.

**Note:** Consent is required only once per user. After accepting, they won't see this prompt again.

### Admin Pre-Consent (Optional)

To avoid individual user consent prompts, an administrator can grant organization-wide consent:

1. Navigate to: `https://login.microsoftonline.com/organizations/adminconsent?client_id=19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c&redirect_uri=https://rhythm-icons-production.up.railway.app/admin-consent`

2. Sign in as a Global Administrator
3. Review the requested permissions
4. Click **Accept** to grant consent for all users in your organization

After admin consent, users will not see the consent prompt when they first sign in.

---

## Managing the Add-in After Deployment

### View Deployment Status

1. Go to **Microsoft 365 Admin Center → Settings → Integrated apps → Add-ins**
2. Find "Rhythm Icons Library" in the list
3. Click on it to view:
   - Assigned users/groups
   - Deployment status
   - Last updated date

### Update User Assignments

To add or remove users:

1. Click on "Rhythm Icons Library"
2. Click **Edit users**
3. Add or remove users/groups
4. Click **Save**

Changes take effect within 1-4 hours.

### Remove the Add-in

To completely remove the add-in from your organization:

1. Go to **Settings → Integrated apps → Add-ins**
2. Find "Rhythm Icons Library"
3. Click the three dots (•••) next to it
4. Select **Remove**
5. Confirm removal

**Warning:** This will remove the add-in for all users. Custom icons uploaded by users will be deleted after 30 days.

---

## Troubleshooting

### Add-in Not Appearing for Users

**Possible Causes:**
- Deployment is still in progress (wait up to 24 hours)
- User is not in the assigned group
- User's Office app needs to be restarted
- Office cache needs to be cleared

**Solutions:**
1. Verify user is assigned to the add-in
2. Have user close and reopen Word/PowerPoint
3. Wait the full 24-hour deployment window
4. Clear Office cache (see below)

### Clearing Office Cache (Windows)

1. Close all Office applications
2. Press **Win + R** and paste: `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`
3. Delete all files in this folder
4. Restart Office

### Clearing Office Cache (Mac)

1. Close all Office applications
2. Open Finder
3. Press **Cmd + Shift + G** and paste: `~/Library/Containers/com.microsoft.Word/Data/Library/Caches/`
4. Delete the cache folder
5. Restart Office

### Sign-In Errors

**Error:** "Sign-in failed" or "Invalid token"

**Causes:**
- User is trying to sign in with a personal Microsoft account (not supported)
- Azure AD conditional access policy is blocking the add-in
- App permissions not properly configured

**Solutions:**
1. Ensure user is signing in with their **organizational** Microsoft 365 account
2. Check Azure AD conditional access policies for the app ID: `19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c`
3. Contact Rhythm Icons support if issue persists

### Users Can't Insert Icons

**Causes:**
- Document is in protected/restricted mode
- User doesn't have edit permissions
- Office app is in Read Mode or Slide Show mode

**Solutions:**
1. Ensure document is editable
2. Exit Read Mode (Word) or Slide Show (PowerPoint)
3. Try clicking on a different part of the document

---

## Security & Compliance

### Data Privacy

- **Authentication:** The add-in uses Azure Active Directory (Azure AD) for secure authentication
- **Data Isolation:** Each organization's custom icons are isolated in separate tenants
- **Data Storage:** Icon data is stored in secure PostgreSQL databases with encryption
- **GDPR Compliance:** The add-in complies with GDPR requirements

For details, see our [Privacy Policy](https://rhythm-icons-production.up.railway.app/privacy).

### Permissions Required

The add-in requests the following OAuth scopes:

| Scope | Purpose |
|-------|---------|
| `Icons.Read` | Access icon library and insert icons |
| `openid` | Sign in with Azure AD |
| `profile` | Read user's display name |
| `email` | Read user's email address |

### Azure AD App Registration

The add-in is registered in Azure AD with:
- **Application ID:** `19c2f55b-db3c-44c0-9ca6-1fd91f8a2c5c`
- **Publisher:** Spectrum Science Communications, LLC
- **Multi-tenant:** Yes (supports any Azure AD organization)

### Conditional Access Policies

If your organization uses conditional access policies, ensure the add-in app ID is not blocked. You may need to create an exclusion rule.

---

## Feature Overview

### Icon Library

- **Standard Library:** 30+ curated medical and scientific icons
- **Custom Icons:** Upload SVG icons for your organization (tenant-specific)
- **Search:** Find icons quickly by name, category, or keyword

### Icon Customization

- **Size:** 32px, 48px, 64px, 96px options
- **Color (PowerPoint only):** Choose from PowerPoint theme colors (Accent1-6, Text1-2, etc.)
- **Circle Background:** Optional circular background for icons

### Supported Applications

- **Microsoft Word:** 2016 or later (Desktop, Online, Mobile)
- **Microsoft PowerPoint:** 2016 or later (Desktop, Online, Mobile)

---

## Support & Contact

### For IT Administrators

- **Email:** it-support@spectrum-science.com
- **Documentation:** [https://rhythm-icons-production.up.railway.app/support](https://rhythm-icons-production.up.railway.app/support)

### For End Users

- **Email:** support@spectrum-science.com
- **User Guide:** See `/docs/USER_GUIDE.md`

### Billing & Accounts

- **Email:** accounts@spectrum-science.com

---

## Appendix: Manual Sideloading (Testing)

For pilot testing before centralized deployment, users can manually sideload the add-in:

### In Word/PowerPoint Desktop

1. Click **Insert → Add-ins → My Add-ins**
2. Click **Manage My Add-ins** (top right)
3. Select **Upload My Add-in**
4. Browse to `manifest.production.xml` and click **Upload**
5. The add-in will appear in the taskpane

### In Office Online

1. Click **Insert → Add-ins**
2. Click **Manage My Add-ins**
3. Click **Upload My Add-in**
4. Browse to `manifest.production.xml` and click **Upload**

**Note:** Manually sideloaded add-ins are only available to the user who uploaded them and must be re-uploaded if the manifest is updated.

---

## Update History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | March 2026 | Initial release |

For the latest version of this guide, visit: [https://rhythm-icons-production.up.railway.app/docs/deployment](https://rhythm-icons-production.up.railway.app/docs/deployment)

---

**© 2026 Spectrum Science Communications, LLC. All rights reserved.**
