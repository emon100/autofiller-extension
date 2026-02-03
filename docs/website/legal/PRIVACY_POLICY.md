# AutoFiller Privacy Policy

**Last Updated: January 2025**

AutoFiller is a Chrome browser extension that helps you auto-fill job application forms. This privacy policy explains what data we collect, how we use it, and your rights regarding your data.

---

## Summary

- All your data is stored **locally on your device**
- We do **NOT** upload your personal information to any server
- We do **NOT** sell or share your data with third parties
- You can delete all your data at any time

---

## What Data We Collect

### Data You Provide

When you use AutoFiller, the following information is stored **locally in your browser**:

| Data Type | Examples | Purpose |
|-----------|----------|---------|
| Personal Information | Name, email, phone, address | Auto-fill form fields |
| Education History | School, degree, major, graduation date | Auto-fill education sections |
| Work Experience | Company, job title, dates | Auto-fill work history sections |
| Preferences | Preferred settings, enabled features | Customize your experience |

### Data We Automatically Collect

| Data Type | What We Collect | Purpose |
|-----------|-----------------|---------|
| Site Domain | e.g., "greenhouse.io" | Track which sites you've used AutoFiller on |
| Form Field Labels | e.g., "First Name", "Email" | Train the extension to recognize similar fields |
| Fill History | Timestamp and field count | Show your activity log |

### What We Do NOT Collect

- ❌ Browsing history beyond sites where you activate AutoFiller
- ❌ Passwords or authentication credentials
- ❌ Financial information (bank accounts, credit cards)
- ❌ Government ID numbers
- ❌ Health information
- ❌ Contents of forms you choose not to save

---

## How We Store Your Data

### Local Storage Only

All data is stored using Chrome's built-in Storage API (`chrome.storage.local`). This means:

- Data stays on **your device only**
- Data is **not synced** to Google's servers
- Data is **not accessible** to us or any third party
- Data is automatically deleted when you uninstall the extension

### Encryption

Sensitive fields (marked as "sensitive" in the app) are stored with additional protection and require explicit confirmation before auto-filling.

---

## AI/LLM Usage (Optional Feature)

When you enable the AI-powered field classification feature:

### What We Send to AI Services

- **Form field labels only** (e.g., "First Name", "Work Authorization")
- **Form structure information** (e.g., field types, groupings)

### What We Do NOT Send

- ❌ Your actual personal information (your name, email, etc.)
- ❌ Your filled-in form values
- ❌ Your browsing history
- ❌ Any identifiable information about you

### AI Service Providers

Depending on your settings, field classification may use:
- Alibaba Cloud Qwen (通义千问)
- OpenAI GPT
- Anthropic Claude
- Other providers you configure

You can disable AI features entirely in Settings → LLM Classification → Disabled.

---

## Permissions Explained

AutoFiller requests the following browser permissions:

| Permission | Why We Need It |
|------------|----------------|
| **Storage** | Save your profile data and preferences locally |
| **Active Tab** | Read form fields on the current page you're viewing |
| **Scripting** | Inject the auto-fill functionality into web pages |
| **Tabs** | Get the current page URL to show site-specific settings |
| **Side Panel** | Display the management interface |
| **Host Permissions** | Access job application sites to read and fill forms |

### About Host Permissions

By default, AutoFiller has access to popular job application platforms:
- Greenhouse, Lever, Workday, SmartRecruiters, iCIMS, Taleo, BambooHR, Ashby, Breezy, Recruitee, Jobvite

For other websites, you can grant permission when needed:
1. Visit the job application page
2. Click the AutoFiller icon
3. Choose "Allow on this site" when prompted

---

## Your Rights

### Access Your Data

You can view all stored data in the AutoFiller side panel under "Saved Answers".

### Delete Your Data

You can delete your data at any time:

1. **Delete individual items**: Click the delete button next to any saved answer
2. **Delete all data**: Go to Settings → Clear All Data
3. **Complete removal**: Uninstall the extension (all data is automatically deleted)

### Export Your Data

You can export your saved data from Settings → Export Data (feature coming soon).

---

## Data Security

- All data remains on your local device
- No server-side storage means no risk of data breaches on our end
- Sensitive fields are marked and protected from automatic filling
- You control which sites can access the extension

---

## Children's Privacy

AutoFiller is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children.

---

## Changes to This Policy

We may update this privacy policy from time to time. We will notify you of any changes by:
- Updating the "Last Updated" date at the top
- Showing a notification in the extension (for significant changes)

---

## Contact Us

If you have questions about this privacy policy or your data, please contact:

- **Email**: [your-email@example.com]
- **GitHub Issues**: [https://github.com/your-repo/autofiller/issues]

---

## Compliance

This extension is designed to comply with:
- Chrome Web Store Developer Program Policies
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)

---

*This privacy policy is also available at: https://autofiller.io/privacy*
