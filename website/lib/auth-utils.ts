// 认证相关的错误消息翻译
const errorMessages: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码错误',
  'User already registered': '该邮箱已注册，请直接登录',
  'Token has expired or is invalid': '验证码已过期，请重新发送',
  'Email rate limit exceeded': '发送过于频繁，请稍后再试',
  'Password should be at least 6 characters': '密码至少需要6位',
  'Signup requires a valid password': '请输入有效的密码',
  'Email not confirmed': '请先验证邮箱',
  'User not found': '用户不存在',
};

export function translateAuthError(error: string): string {
  for (const [key, value] of Object.entries(errorMessages)) {
    if (error.includes(key)) return value;
  }
  return error;
}
