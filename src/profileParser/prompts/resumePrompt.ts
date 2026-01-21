export const RESUME_PARSE_PROMPT = `You are a resume parser. Extract structured information from the resume text below.

Return a JSON object with the following structure:
{
  "fullName": "Full name of the candidate",
  "firstName": "First name only",
  "lastName": "Last name only",
  "email": "Email address",
  "phone": "Phone number (with country code if present)",
  "location": "Full location/address",
  "city": "City name only",
  "linkedinUrl": "LinkedIn profile URL",
  "githubUrl": "GitHub profile URL",
  "portfolioUrl": "Portfolio/personal website URL",
  "summary": "Professional summary or objective",
  "education": [
    {
      "school": "University/School name",
      "degree": "Degree type (e.g., Bachelor of Science, Master of Arts)",
      "major": "Field of study/Major",
      "gpa": "GPA if mentioned",
      "startDate": "YYYY-MM format",
      "endDate": "YYYY-MM format",
      "gradDate": "YYYY-MM format if graduation date is explicitly mentioned"
    }
  ],
  "experience": [
    {
      "company": "Company name",
      "title": "Job title",
      "location": "Work location",
      "startDate": "YYYY-MM format",
      "endDate": "YYYY-MM format or 'present' if current",
      "description": "Job description/responsibilities",
      "highlights": ["Key achievement 1", "Key achievement 2"]
    }
  ],
  "skills": ["Skill 1", "Skill 2", "..."]
}

Important:
- Extract ALL education entries, ordered from most recent to oldest
- Extract ALL work experiences, ordered from most recent to oldest
- Use YYYY-MM format for dates (e.g., "2023-06")
- If only year is available, use YYYY-01 (e.g., "2023-01")
- Use "present" for current positions
- Leave fields as null if not found
- For skills, extract individual technical skills, tools, and technologies

Resume text:
`

export const RESUME_VISION_PROMPT = `You are a resume parser analyzing a resume image. Extract all information visible in the resume.

Return a JSON object with the following structure:
{
  "fullName": "Full name of the candidate",
  "firstName": "First name only",
  "lastName": "Last name only",
  "email": "Email address",
  "phone": "Phone number (with country code if present)",
  "location": "Full location/address",
  "city": "City name only",
  "linkedinUrl": "LinkedIn profile URL",
  "githubUrl": "GitHub profile URL",
  "portfolioUrl": "Portfolio/personal website URL",
  "summary": "Professional summary or objective",
  "education": [
    {
      "school": "University/School name",
      "degree": "Degree type",
      "major": "Field of study",
      "gpa": "GPA if visible",
      "startDate": "YYYY-MM format",
      "endDate": "YYYY-MM format",
      "gradDate": "YYYY-MM format"
    }
  ],
  "experience": [
    {
      "company": "Company name",
      "title": "Job title",
      "location": "Work location",
      "startDate": "YYYY-MM format",
      "endDate": "YYYY-MM format or 'present'",
      "description": "Job description",
      "highlights": ["Achievement 1", "Achievement 2"]
    }
  ],
  "skills": ["Skill 1", "Skill 2"]
}

Important:
- Carefully read all text in the image
- Order education and experience from most recent to oldest
- Use YYYY-MM format for dates
- Use "present" for current positions
- Leave fields as null if not visible
`
