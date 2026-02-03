import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// LLM Configuration from environment variables
const LLM_CONFIG = {
  endpoint: process.env.LLM_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
  apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
  model: process.env.LLM_MODEL || 'gpt-4o-mini',
  // Cost per classification batch (can be configured)
  creditCost: parseInt(process.env.LLM_CREDIT_COST || '1', 10),
};

// LLM proxy endpoint - handles classification requests and billing
export async function POST(request: Request) {
  // Authenticate user via Bearer token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const adminClient = createAdminClient();
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fields } = body;

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'Invalid request: fields required' }, { status: 400 });
    }

    // Check credits before processing
    const supabase = adminClient;

    // Check for active subscription (unlimited)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const hasUnlimitedPlan = !!subscription;
    const creditCost = LLM_CONFIG.creditCost;

    if (!hasUnlimitedPlan) {
      // Get current balance
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (creditsError || !credits) {
        return NextResponse.json({ error: 'Failed to check credits' }, { status: 500 });
      }

      if (credits.balance < creditCost) {
        return NextResponse.json({
          error: 'Insufficient credits',
          balance: credits.balance,
          required: creditCost,
        }, { status: 402 });
      }

      // Deduct credits
      const newBalance = credits.balance - creditCost;

      const { error: updateError } = await supabase
        .from('credits')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
      }

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -creditCost,
        type: 'llm_classification',
        description: `LLM classification for ${fields.length} field(s)`,
        metadata: {
          model: LLM_CONFIG.model,
          field_count: fields.length,
          endpoint: LLM_CONFIG.endpoint,
        },
      });
    }

    // Call the LLM API
    const llmResponse = await callLLM(fields);

    return NextResponse.json({
      success: true,
      results: llmResponse,
      creditsUsed: hasUnlimitedPlan ? 0 : creditCost,
    });

  } catch (error) {
    console.error('LLM proxy error:', error);
    return NextResponse.json({
      error: 'LLM request failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

interface FieldMetadata {
  index: number;
  labelText?: string;
  name?: string;
  id?: string;
  type?: string;
  placeholder?: string;
  options?: string[];
  surroundingText?: string;
}

interface ClassificationResult {
  index: number;
  type: string;
  confidence: number;
}

const TAXONOMY_LIST = `
- FULL_NAME: Full name (first and last)
- FIRST_NAME: First/given name only
- LAST_NAME: Last/family name only
- EMAIL: Email address
- PHONE: Phone/mobile number
- COUNTRY_CODE: Phone country code
- LOCATION: Full address or location
- CITY: City name
- LINKEDIN: LinkedIn profile URL
- GITHUB: GitHub profile URL
- PORTFOLIO: Portfolio/personal website URL
- SCHOOL: School/university name
- DEGREE: Degree type (Bachelor, Master, PhD)
- MAJOR: Field of study/major
- GPA: Grade point average
- GRAD_DATE: Graduation date
- GRAD_YEAR: Graduation year
- GRAD_MONTH: Graduation month
- START_DATE: Start date (job/education)
- END_DATE: End date (job/education)
- WORK_AUTH: Work authorization status
- NEED_SPONSORSHIP: Visa sponsorship requirement
- COMPANY_NAME: Company/employer name
- JOB_TITLE: Job title/position
- JOB_DESCRIPTION: Job duties/responsibilities
- SKILLS: Skills and competencies
- SUMMARY: Professional summary/objective
- RESUME_TEXT: Resume/CV content
- SALARY: Salary expectation
- EEO_GENDER: Gender (EEO)
- EEO_ETHNICITY: Race/ethnicity (EEO)
- EEO_VETERAN: Veteran status (EEO)
- EEO_DISABILITY: Disability status (EEO)
- GOV_ID: Government ID (SSN, etc.)
`.trim();

async function callLLM(fields: FieldMetadata[]): Promise<ClassificationResult[]> {
  if (!LLM_CONFIG.apiKey) {
    throw new Error('LLM API key not configured');
  }

  // Build prompt
  const fieldsDescription = fields.map(field => {
    const parts: string[] = [];
    if (field.labelText) parts.push(`Label: ${field.labelText}`);
    if (field.name) parts.push(`Name: ${field.name}`);
    if (field.id) parts.push(`ID: ${field.id}`);
    if (field.type) parts.push(`Type: ${field.type}`);
    if (field.placeholder) parts.push(`Placeholder: ${field.placeholder}`);
    if (field.options?.length) parts.push(`Options: ${field.options.slice(0, 5).join(', ')}`);
    if (field.surroundingText) parts.push(`Context: ${field.surroundingText.slice(0, 100)}`);
    return `[Field ${field.index}]\n${parts.join('\n')}`;
  }).join('\n\n');

  const prompt = `Classify these ${fields.length} form fields. Available types:

${TAXONOMY_LIST}

Fields to classify:

${fieldsDescription}

Return a JSON array with classification for each field:
[{"index": 0, "type": "TYPE_NAME", "confidence": 0.0-1.0}, ...]

Rules:
- Use UNKNOWN with confidence 0 if uncertain
- Each field must have an entry in the response`;

  // Call OpenAI-compatible API
  const response = await fetch(LLM_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: LLM_CONFIG.model,
      messages: [
        { role: 'system', content: 'You are a form field classifier. Respond only with valid JSON array.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse response
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    throw new Error('Invalid LLM response format');
  }

  return JSON.parse(arrayMatch[0]) as ClassificationResult[];
}

// Health check endpoint to verify LLM configuration
export async function GET() {
  return NextResponse.json({
    configured: !!LLM_CONFIG.apiKey,
    endpoint: LLM_CONFIG.endpoint,
    model: LLM_CONFIG.model,
    creditCost: LLM_CONFIG.creditCost,
  });
}
