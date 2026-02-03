# SEO & Advertising Strategy

## Overview

This document outlines the SEO and paid advertising strategy for AutoFiller's official website to drive user acquisition and growth.

---

## 1. SEO Strategy

### 1.1 Target Keywords

| Type | Keyword | Est. Monthly Volume | Competition |
|------|---------|---------------------|-------------|
| Core | job application autofill | 1,000-5,000 | Medium |
| Core | auto fill job applications | 500-1,000 | Medium |
| Long-tail | how to fill job forms faster | 100-500 | Low |
| Long-tail | chrome extension for job search | 500-1,000 | High |
| Long-tail | best tools for job seekers 2026 | 100-500 | Low |
| Brand | autofiller chrome extension | - | Low |

### 1.2 Content Strategy

| Page | Target Keywords | Content Type |
|------|-----------------|--------------|
| `/` (Home) | job application autofill | Product landing page |
| `/blog/save-time-job-applications` | how to fill job forms faster | Tutorial blog |
| `/blog/best-job-search-tools` | best tools for job seekers | Tool comparison |
| `/docs/supported-sites` | greenhouse lever workday autofill | Feature documentation |
| `/pricing` | job application helper pricing | Pricing page |

### 1.3 Technical SEO

- **Framework**: Next.js with SSG/ISR for pre-rendering
- **Structured Data**: JSON-LD schema markup for:
  - Organization
  - Product
  - FAQ
  - BreadcrumbList
- **Sitemap**: Auto-generated `sitemap.xml`
- **Core Web Vitals**: Target scores > 90 for LCP, FID, CLS
- **Mobile-first**: Responsive design with mobile optimization

### 1.4 On-Page SEO Checklist

- [ ] Unique title tags (50-60 chars)
- [ ] Meta descriptions (150-160 chars)
- [ ] H1 tags with primary keywords
- [ ] Image alt text optimization
- [ ] Internal linking structure
- [ ] URL structure with keywords
- [ ] Schema markup implementation

---

## 2. Paid Advertising Strategy

### 2.1 Phase 1: Validation (Monthly Budget: £500-1,000)

| Channel | Budget Allocation | Target | KPI |
|---------|-------------------|--------|-----|
| Google Search Ads | 60% (£300-600) | High-intent traffic | CPA < £5 |
| Reddit Ads | 30% (£150-300) | r/jobs, r/jobsearch | CTR > 1% |
| LinkedIn Ads | 10% (£50-100) | Testing | Baseline data |

### 2.2 Google Ads Keyword Bidding

| Keyword | Est. CPC | Priority |
|---------|----------|----------|
| job application chrome extension | £1-3 | P0 |
| auto fill job forms | £0.5-2 | P0 |
| resume autofill tool | £1-4 | P1 |
| job application helper | £0.5-1.5 | P1 |

### 2.3 Phase 2: Scaling (Monthly Budget: £2,000-5,000)

| Channel | Budget Allocation | Target |
|---------|-------------------|--------|
| Google Search | 50% | Expand keyword coverage |
| Google Display | 15% | Remarketing |
| LinkedIn | 20% | B2B/Recruiters |
| Reddit/Twitter | 15% | Community users |

### 2.4 Ad Creative Guidelines

**Headlines (30 chars max)**:
- "Fill Job Forms 10x Faster"
- "Stop Typing. Start Applying."
- "Job Application Autofill"

**Descriptions (90 chars max)**:
- "Save hours on job applications. One-click autofill for Greenhouse, Lever, Workday & more."
- "Trusted by 10,000+ job seekers. Fill any application form in seconds. Try free today."

---

## 3. ROI Targets

### 3.1 Key Metrics

| Metric | Target |
|--------|--------|
| Customer Acquisition Cost (CAC) | £10-15 |
| LTV:CAC Ratio | 3-5x |
| First Month ROAS | 100%+ (break-even) |
| Conversion Rate (visitor to signup) | 3-5% |
| Free to Paid Conversion | 5-10% |

### 3.2 Attribution Model

- **Primary**: Last-click attribution
- **Secondary**: Linear attribution for multi-touch
- **Tools**: Google Analytics 4, Paddle analytics

---

## 4. Channel-Specific Tactics

### 4.1 Google Search Ads

**Campaign Structure**:
```
Account
├── Brand Campaign (exact match)
│   └── "autofiller", "autofiller chrome"
├── Competitor Campaign
│   └── "[competitor] alternative"
├── Generic Campaign
│   ├── Ad Group: Job Application Tools
│   ├── Ad Group: Chrome Extensions
│   └── Ad Group: Autofill Tools
└── Remarketing Campaign
    └── Website visitors (30 days)
```

**Negative Keywords**:
- "free" (for paid campaigns)
- "pdf autofill"
- "tax form autofill"
- "password autofill"

### 4.2 Reddit Ads

**Target Subreddits**:
- r/jobs (1.2M members)
- r/jobsearch (100K members)
- r/careerguidance (500K members)
- r/cscareerquestions (800K members)
- r/recruiting (50K members)

**Ad Format**: Promoted posts with native feel

### 4.3 LinkedIn Ads

**Targeting**:
- Job Function: Job Seeker, Career Development
- Seniority: Entry, Associate, Mid-Senior
- Industries: Technology, Finance, Consulting

**Ad Format**: Sponsored content, Lead gen forms

---

## 5. Testing & Optimization

### 5.1 A/B Testing Plan

| Element | Test A | Test B | Duration |
|---------|--------|--------|----------|
| Landing page headline | Speed focus | Ease focus | 2 weeks |
| CTA button color | Blue | Green | 2 weeks |
| Pricing display | Monthly | Annual (default) | 2 weeks |
| Social proof | User count | Reviews | 2 weeks |

### 5.2 Optimization Cadence

- **Daily**: Budget pacing, anomaly detection
- **Weekly**: Keyword bid adjustments, ad performance review
- **Bi-weekly**: A/B test analysis, creative refresh
- **Monthly**: Channel performance review, budget reallocation

---

## 6. Timeline

### Month 1-2: Foundation
- [ ] Set up tracking (GA4, conversion pixels)
- [ ] Launch Google Search campaigns
- [ ] Create initial ad creatives
- [ ] Set up Reddit test campaigns

### Month 3-4: Optimization
- [ ] Analyze initial data
- [ ] Optimize keyword bids
- [ ] Expand to LinkedIn
- [ ] Launch remarketing

### Month 5-6: Scaling
- [ ] Increase budget on winning channels
- [ ] Test Display advertising
- [ ] Implement automated bidding
- [ ] Explore influencer partnerships

---

## 7. Budget Summary

### Year 1 Projection

| Quarter | Monthly Budget | Focus |
|---------|----------------|-------|
| Q1 | £500-1,000 | Validation, testing |
| Q2 | £1,000-2,000 | Optimization |
| Q3 | £2,000-3,000 | Scaling winners |
| Q4 | £3,000-5,000 | Full scale |

**Total Year 1 Budget**: £18,000-33,000
**Target Signups**: 3,000-6,000
**Target Paying Users**: 300-600

---

## 8. Tools & Platforms

| Purpose | Tool |
|---------|------|
| Web Analytics | Google Analytics 4 |
| Ad Management | Google Ads, Reddit Ads, LinkedIn Campaign Manager |
| Heatmaps | Hotjar (free tier) |
| A/B Testing | Vercel (built-in) |
| Keyword Research | Google Keyword Planner, Ubersuggest |
| Competitor Analysis | SimilarWeb, SpyFu |
