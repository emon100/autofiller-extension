# 1Fillr Privacy Policy

**Last Updated: February 2026**

## Overview

1Fillr ("we", "our", or "the extension") is a browser extension designed to help users automatically fill job application forms. This privacy policy explains how we collect, use, and protect your data.

## Data Collection

### What We Collect

1. **Form Data You Enter**
   - Personal information (name, email, phone, address)
   - Education history (schools, degrees, dates)
   - Work experience (companies, job titles, dates)
   - Skills and qualifications

2. **Form Interaction Data**
   - Which form fields you fill out
   - Form field labels and types (for learning purposes)
   - Website hostnames (not full URLs)

3. **Optional: LinkedIn Profile Data**
   - If you use the "Import from LinkedIn" feature, we parse your public profile information

### What We Do NOT Collect
- Passwords or payment information
- Browsing history unrelated to form filling
- Data from non-form pages
- Cookies or tracking identifiers

## Data Storage

### Local Storage Only
**All your personal data is stored locally on your device** using Chrome's secure storage API (`chrome.storage.local`). Your data never leaves your browser unless you explicitly:
- Use an AI-powered feature (see AI Services section)
- Export your data manually

### Data Retention
- Data persists until you delete it
- Uninstalling the extension removes all stored data
- You can clear all data anytime via Settings > Clear Data

## AI Services (Optional)

If you enable AI-powered features (LLM classification), the following occurs:

### What Gets Sent to AI Providers
- Form field metadata (labels, types, placeholders)
- **NOT your actual form values** - only field structure information

### Supported Providers
- OpenAI (api.openai.com)
- Anthropic (api.anthropic.com)
- Other OpenAI-compatible endpoints you configure

### Your API Keys
- You provide your own API keys
- Keys are stored locally and encrypted
- We never have access to your API keys

## Third-Party Services

### 1Fillr Backend (Optional)
If you create an 1Fillr account for cloud sync:
- Email address for authentication
- Encrypted profile data (if you enable sync)
- Usage statistics (fill counts, not content)

Server location: Cloudflare Workers (Global)

## Data Sharing

We do NOT:
- Sell your data to anyone
- Share data with advertisers
- Use data for marketing purposes
- Transfer data to third parties (except AI providers you configure)

## Your Rights

You have the right to:
- **Access**: Export all your data via Settings > Export
- **Delete**: Clear all data via Settings > Clear Data
- **Portability**: Export data in JSON format
- **Opt-out**: Disable any feature you don't want

## Security Measures

- All data stored locally with Chrome's secure storage
- Sensitive fields (SSN, salary) marked and handled with extra caution
- No data transmitted over unencrypted connections
- API keys encrypted before storage

## Children's Privacy

1Fillr is not intended for users under 13 years of age. We do not knowingly collect data from children.

## Changes to This Policy

We may update this policy occasionally. Significant changes will be announced via extension update notes.

## Contact Us

For privacy concerns or questions:
- Email: privacy@1fillr.co.uk
- GitHub: https://github.com/1fillr/extension/issues

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- GDPR (for EU users)
- CCPA (for California users)

---

*By using 1Fillr, you agree to this privacy policy.*
