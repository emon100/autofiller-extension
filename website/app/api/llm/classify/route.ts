import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// LLM Configuration
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'vercel') as 'vercel' | 'openrouter';
const LLM_MODEL = process.env.LLM_MODEL || 'openai/gpt-4o-mini';
const LLM_CREDIT_COST = parseInt(process.env.LLM_CREDIT_COST || '1', 10);

// Security limits
const MAX_FIELDS = 50;
const MAX_FIELD_TEXT_LENGTH = 200;

const getModel = () =>
  LLM_PROVIDER === 'openrouter'
    ? createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY || '' })(LLM_MODEL)
    : gateway(LLM_MODEL);

// Sanitize input to prevent prompt injection
function sanitize(input: string | undefined, maxLen = MAX_FIELD_TEXT_LENGTH): string {
  if (!input) return '';
  return input
    .replace(/ignore\s+(?:all\s+)?previous\s+instructions?/gi, '')
    .replace(/(system|assistant|user)\s*:/gi, '')
    .slice(0, maxLen)
    .trim();
}

// LLM proxy endpoint
export async function POST(request: Request) {
  // Auth
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const adminClient = createAdminClient();
  const { data: { user }, error: authError } = await adminClient.auth.getUser(authHeader.slice(7));

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  // Parse & validate input
  let body: { fields?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const { fields } = body;
  if (!Array.isArray(fields) || fields.length === 0 || fields.length > MAX_FIELDS) {
    return NextResponse.json({ error: `fields must be array with 1-${MAX_FIELDS} items` }, { status: 400, headers: corsHeaders });
  }

  const supabase = adminClient;

  // Check subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const hasUnlimitedPlan = !!subscription;
  let creditsDeducted = false;

  // Deduct credits first (atomic)
  if (!hasUnlimitedPlan) {
    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_credits', { p_user_id: user.id, p_amount: LLM_CREDIT_COST });

    if (deductError) {
      return NextResponse.json({ error: 'Payment processing failed' }, { status: 500, headers: corsHeaders });
    }

    if (deductResult === -1) {
      const { data: credits } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        error: 'Insufficient credits',
        balance: credits?.balance || 0,
        required: LLM_CREDIT_COST,
      }, { status: 402, headers: corsHeaders });
    }

    creditsDeducted = true;
  }

  // Call LLM
  try {
    const llmResponse = await callLLM(fields as FieldMetadata[]);

    if (creditsDeducted) {
      // Log transaction (ignore failures)
      supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -LLM_CREDIT_COST,
        type: 'llm_classification',
        description: `LLM classification for ${fields.length} field(s)`,
        metadata: { model: LLM_MODEL, field_count: fields.length },
      }).then(() => {});
    }

    return NextResponse.json({
      success: true,
      results: llmResponse,
      creditsUsed: hasUnlimitedPlan ? 0 : LLM_CREDIT_COST,
    }, { headers: corsHeaders });

  } catch {
    // Refund on failure
    if (creditsDeducted) {
      const { error: refundError } = await supabase.rpc('refund_credits', { p_user_id: user.id, p_amount: LLM_CREDIT_COST });
      if (refundError) {
        console.error('CRITICAL: Refund failed', { userId: user.id, amount: LLM_CREDIT_COST });
      }

      supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: LLM_CREDIT_COST,
        type: 'refund',
        description: 'Refund for failed LLM request',
      }).then(() => {});
    }

    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503, headers: corsHeaders });
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
  const fieldsDescription = fields.map(field => {
    const parts: string[] = [];
    if (field.labelText) parts.push(`Label: ${sanitize(field.labelText)}`);
    if (field.name) parts.push(`Name: ${sanitize(field.name, 100)}`);
    if (field.id) parts.push(`ID: ${sanitize(field.id, 100)}`);
    if (field.type) parts.push(`Type: ${sanitize(field.type, 50)}`);
    if (field.placeholder) parts.push(`Placeholder: ${sanitize(field.placeholder)}`);
    if (field.options?.length) parts.push(`Options: ${field.options.slice(0, 5).map(o => sanitize(o, 50)).join(', ')}`);
    if (field.surroundingText) parts.push(`Context: ${sanitize(field.surroundingText, 100)}`);
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

  const { text } = await generateText({
    model: getModel(),
    system: 'You are a form field classifier. Respond only with valid JSON array.',
    prompt,
    temperature: 0,
    maxOutputTokens: 1000,
  });

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    throw new Error('Invalid response format');
  }

  try {
    return JSON.parse(arrayMatch[0]) as ClassificationResult[];
  } catch {
    throw new Error('Failed to parse response');
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Health check (no sensitive info exposed)
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: corsHeaders });
}
