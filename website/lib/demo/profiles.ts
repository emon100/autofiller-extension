import { Taxonomy, DemoAnswerValue, DemoProfile, SENSITIVE_TYPES } from './types'

function createAnswer(type: Taxonomy, value: string, display?: string): DemoAnswerValue {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    value,
    display: display || value,
    aliases: [],
    sensitivity: SENSITIVE_TYPES.has(type) ? 'sensitive' : 'normal',
    autofillAllowed: !SENSITIVE_TYPES.has(type),
  }
}

export const US_PROFILE: DemoProfile = {
  id: 'us',
  name: 'US Applicant',
  answers: {
    [Taxonomy.FULL_NAME]: createAnswer(Taxonomy.FULL_NAME, 'John Michael Doe'),
    [Taxonomy.FIRST_NAME]: createAnswer(Taxonomy.FIRST_NAME, 'John'),
    [Taxonomy.LAST_NAME]: createAnswer(Taxonomy.LAST_NAME, 'Doe'),
    [Taxonomy.EMAIL]: createAnswer(Taxonomy.EMAIL, 'john.doe@gmail.com'),
    [Taxonomy.PHONE]: createAnswer(Taxonomy.PHONE, '+14155551234', '+1 (415) 555-1234'),
    [Taxonomy.COUNTRY_CODE]: createAnswer(Taxonomy.COUNTRY_CODE, '+1'),
    [Taxonomy.CITY]: createAnswer(Taxonomy.CITY, 'San Francisco'),
    [Taxonomy.LOCATION]: createAnswer(Taxonomy.LOCATION, 'San Francisco, CA'),
    [Taxonomy.LINKEDIN]: createAnswer(Taxonomy.LINKEDIN, 'https://linkedin.com/in/johndoe', 'linkedin.com/in/johndoe'),
    [Taxonomy.GITHUB]: createAnswer(Taxonomy.GITHUB, 'https://github.com/johndoe', 'github.com/johndoe'),
    [Taxonomy.PORTFOLIO]: createAnswer(Taxonomy.PORTFOLIO, 'https://johndoe.dev', 'johndoe.dev'),
    [Taxonomy.SCHOOL]: createAnswer(Taxonomy.SCHOOL, 'Stanford University'),
    [Taxonomy.DEGREE]: createAnswer(Taxonomy.DEGREE, "Master's", "Master's Degree"),
    [Taxonomy.MAJOR]: createAnswer(Taxonomy.MAJOR, 'Computer Science'),
    [Taxonomy.GRAD_DATE]: createAnswer(Taxonomy.GRAD_DATE, '2024-05-15', 'May 2024'),
    [Taxonomy.GRAD_YEAR]: createAnswer(Taxonomy.GRAD_YEAR, '2024'),
    [Taxonomy.GRAD_MONTH]: createAnswer(Taxonomy.GRAD_MONTH, '05', 'May'),
    [Taxonomy.WORK_AUTH]: createAnswer(Taxonomy.WORK_AUTH, 'yes', 'Yes'),
    [Taxonomy.NEED_SPONSORSHIP]: createAnswer(Taxonomy.NEED_SPONSORSHIP, 'no', 'No'),
  },
}

export const CN_PROFILE: DemoProfile = {
  id: 'cn',
  name: 'CN Applicant',
  answers: {
    [Taxonomy.FULL_NAME]: createAnswer(Taxonomy.FULL_NAME, '张三'),
    [Taxonomy.FIRST_NAME]: createAnswer(Taxonomy.FIRST_NAME, '三'),
    [Taxonomy.LAST_NAME]: createAnswer(Taxonomy.LAST_NAME, '张'),
    [Taxonomy.EMAIL]: createAnswer(Taxonomy.EMAIL, 'zhangsan@qq.com'),
    [Taxonomy.PHONE]: createAnswer(Taxonomy.PHONE, '+8613812345678', '+86 138 1234 5678'),
    [Taxonomy.COUNTRY_CODE]: createAnswer(Taxonomy.COUNTRY_CODE, '+86'),
    [Taxonomy.CITY]: createAnswer(Taxonomy.CITY, '北京'),
    [Taxonomy.LOCATION]: createAnswer(Taxonomy.LOCATION, '北京, 中国'),
    [Taxonomy.LINKEDIN]: createAnswer(Taxonomy.LINKEDIN, 'https://linkedin.com/in/zhangsan', 'linkedin.com/in/zhangsan'),
    [Taxonomy.GITHUB]: createAnswer(Taxonomy.GITHUB, 'https://github.com/zhangsan', 'github.com/zhangsan'),
    [Taxonomy.PORTFOLIO]: createAnswer(Taxonomy.PORTFOLIO, 'https://zhangsan.cn', 'zhangsan.cn'),
    [Taxonomy.SCHOOL]: createAnswer(Taxonomy.SCHOOL, '清华大学'),
    [Taxonomy.DEGREE]: createAnswer(Taxonomy.DEGREE, '硕士'),
    [Taxonomy.MAJOR]: createAnswer(Taxonomy.MAJOR, '计算机科学'),
    [Taxonomy.GRAD_DATE]: createAnswer(Taxonomy.GRAD_DATE, '2024-06-30', '2024年6月'),
    [Taxonomy.GRAD_YEAR]: createAnswer(Taxonomy.GRAD_YEAR, '2024'),
    [Taxonomy.GRAD_MONTH]: createAnswer(Taxonomy.GRAD_MONTH, '06', '6月'),
    [Taxonomy.WORK_AUTH]: createAnswer(Taxonomy.WORK_AUTH, 'yes', '是'),
    [Taxonomy.NEED_SPONSORSHIP]: createAnswer(Taxonomy.NEED_SPONSORSHIP, 'yes', '是'),
  },
}

export const INTL_PROFILE: DemoProfile = {
  id: 'intl',
  name: 'International',
  answers: {
    [Taxonomy.FULL_NAME]: createAnswer(Taxonomy.FULL_NAME, 'Amit Patel'),
    [Taxonomy.FIRST_NAME]: createAnswer(Taxonomy.FIRST_NAME, 'Amit'),
    [Taxonomy.LAST_NAME]: createAnswer(Taxonomy.LAST_NAME, 'Patel'),
    [Taxonomy.EMAIL]: createAnswer(Taxonomy.EMAIL, 'amit@university.edu'),
    [Taxonomy.PHONE]: createAnswer(Taxonomy.PHONE, '+919876543210', '+91 98765 43210'),
    [Taxonomy.CITY]: createAnswer(Taxonomy.CITY, 'Mumbai'),
    [Taxonomy.LOCATION]: createAnswer(Taxonomy.LOCATION, 'Mumbai, India'),
    [Taxonomy.LINKEDIN]: createAnswer(Taxonomy.LINKEDIN, 'https://linkedin.com/in/amitpatel', 'linkedin.com/in/amitpatel'),
    [Taxonomy.GITHUB]: createAnswer(Taxonomy.GITHUB, 'https://github.com/amitpatel', 'github.com/amitpatel'),
    [Taxonomy.PORTFOLIO]: createAnswer(Taxonomy.PORTFOLIO, 'https://amitpatel.io', 'amitpatel.io'),
    [Taxonomy.SCHOOL]: createAnswer(Taxonomy.SCHOOL, 'IIT Delhi'),
    [Taxonomy.DEGREE]: createAnswer(Taxonomy.DEGREE, "Bachelor's"),
    [Taxonomy.MAJOR]: createAnswer(Taxonomy.MAJOR, 'Electrical Engineering'),
    [Taxonomy.GRAD_DATE]: createAnswer(Taxonomy.GRAD_DATE, '2023-05-01', 'May 2023'),
    [Taxonomy.GRAD_YEAR]: createAnswer(Taxonomy.GRAD_YEAR, '2023'),
    [Taxonomy.GRAD_MONTH]: createAnswer(Taxonomy.GRAD_MONTH, '05', 'May'),
    [Taxonomy.WORK_AUTH]: createAnswer(Taxonomy.WORK_AUTH, 'no', 'No'),
    [Taxonomy.NEED_SPONSORSHIP]: createAnswer(Taxonomy.NEED_SPONSORSHIP, 'yes', 'Yes'),
  },
}

export const PROFILES: Record<string, DemoProfile> = {
  us: US_PROFILE,
  cn: CN_PROFILE,
  intl: INTL_PROFILE,
}
