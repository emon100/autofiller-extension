/**
 * Internationalization (i18n) module
 *
 * Automatically detects browser language and uses Chinese for zh-* locales,
 * English for all other locales. User can override in settings.
 */

export type Locale = 'en' | 'zh' | 'auto'

const STORAGE_KEY = 'userLocale'

// Detect browser language
function detectBrowserLocale(): 'en' | 'zh' {
  const lang = navigator.language || (navigator as any).userLanguage || 'en'
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

// Current locale (actual language being used)
let currentLocale: 'en' | 'zh' = detectBrowserLocale()
// User preference (may be 'auto')
let userPreference: Locale = 'auto'

// Initialize from storage
export async function initLocale(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    if (result[STORAGE_KEY]) {
      userPreference = result[STORAGE_KEY]
      currentLocale = userPreference === 'auto' ? detectBrowserLocale() : userPreference
    }
  } catch {
    // Use default
  }
}

// Initialize synchronously for content scripts (best effort)
try {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(STORAGE_KEY).then(result => {
      if (result[STORAGE_KEY]) {
        userPreference = result[STORAGE_KEY]
        currentLocale = userPreference === 'auto' ? detectBrowserLocale() : userPreference
      }
    }).catch(() => {})
  }
} catch {
  // Ignore errors in non-extension context
}

export function getLocale(): 'en' | 'zh' {
  return currentLocale
}

export function getUserPreference(): Locale {
  return userPreference
}

export async function setLocale(locale: Locale): Promise<void> {
  userPreference = locale
  currentLocale = locale === 'auto' ? detectBrowserLocale() : locale
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: locale })
  } catch {
    // Ignore storage errors
  }
}

export function isZh(): boolean {
  return currentLocale === 'zh'
}

// Translation keys
export const messages = {
  // App
  'app.title': {
    en: 'AutoFiller',
    zh: 'AutoFiller',
  },

  // Language Settings
  'settings.language': {
    en: 'Language',
    zh: '语言',
  },
  'settings.language.auto': {
    en: 'Auto (Browser)',
    zh: '自动 (跟随浏览器)',
  },
  'settings.language.en': {
    en: 'English',
    zh: 'English',
  },
  'settings.language.zh': {
    en: '中文',
    zh: '中文',
  },

  // Tabs
  'tabs.localKnowledge': {
    en: 'Local Database',
    zh: '本地知识库',
  },
  'tabs.import': {
    en: 'Import',
    zh: '导入',
  },
  'tabs.thisSite': {
    en: 'This Site',
    zh: '此网站',
  },
  'tabs.activity': {
    en: 'Activity',
    zh: '活动',
  },
  'tabs.settings': {
    en: 'Settings',
    zh: '设置',
  },
  'tabs.developer': {
    en: 'Developer',
    zh: '开发者',
  },

  // Consent Modal
  'consent.title': {
    en: 'Privacy Notice',
    zh: '隐私声明',
  },
  'consent.subtitle': {
    en: 'Please understand how we handle your data before using',
    zh: '在使用前，请了解我们如何处理您的数据',
  },
  'consent.localStorage.title': {
    en: 'Local Data Storage',
    zh: '本地数据存储',
  },
  'consent.localStorage.desc': {
    en: 'Your form data is stored locally on your device. We do not automatically upload your personal information to any server.',
    zh: '您的表单数据存储在本地设备，不会自动上传到任何服务器。您完全掌控自己的数据。',
  },
  'consent.ai.title': {
    en: 'AI Recognition (Optional)',
    zh: 'AI 智能识别 (可选)',
  },
  'consent.ai.desc': {
    en: 'When enabled, form field labels (not your data) may be sent to AI services to improve recognition accuracy.',
    zh: '启用后，表单字段标签（非您的数据）可能发送至 AI 服务以提高识别准确度。',
  },
  'consent.policyAck': {
    en: 'I have read and agree to the',
    zh: '我已阅读并同意',
  },
  'consent.privacyPolicy': {
    en: 'Privacy Policy',
    zh: '隐私政策',
  },
  'consent.decline': {
    en: 'Decline',
    zh: '拒绝',
  },
  'consent.accept': {
    en: 'Accept & Continue',
    zh: '同意并继续',
  },
  'consent.saving': {
    en: 'Saving...',
    zh: '保存中...',
  },

  // Privacy Section
  'privacy.title': {
    en: 'Privacy & Data',
    zh: '隐私与数据',
  },
  'privacy.policy': {
    en: 'Privacy Policy',
    zh: '隐私政策',
  },
  'privacy.dataSummary': {
    en: 'Local Data Summary',
    zh: '本地数据摘要',
  },
  'privacy.savedAnswers': {
    en: 'Saved Answers',
    zh: '已保存答案',
  },
  'privacy.workEducation': {
    en: 'Work/Education',
    zh: '工作/教育',
  },
  'privacy.fillRecords': {
    en: 'Fill Records',
    zh: '填充记录',
  },
  'privacy.aiEnabled': {
    en: 'AI Features Enabled',
    zh: 'AI 功能已启用',
  },
  'privacy.aiDataSentTo': {
    en: 'Field metadata may be sent to:',
    zh: '字段元数据可能发送至:',
  },
  'privacy.aiDataNote': {
    en: 'Your actual data values are not sent, only field labels and type information.',
    zh: '您的实际数据值不会被发送，仅发送字段标签和类型信息。',
  },
  'privacy.allowAiSharing': {
    en: 'Allow AI data sharing',
    zh: '允许 AI 数据共享',
  },
  'privacy.deleteAll': {
    en: 'Delete All Data',
    zh: '删除所有数据',
  },
  'privacy.deleteConfirm': {
    en: 'Are you sure you want to delete all data?',
    zh: '确定要删除所有数据吗？',
  },
  'privacy.deleteWarning': {
    en: 'This will remove all saved answers, experiences, and settings. This action cannot be undone.',
    zh: '此操作将移除所有保存的答案、经历和设置，且无法恢复。',
  },
  'privacy.cancel': {
    en: 'Cancel',
    zh: '取消',
  },
  'privacy.confirmDelete': {
    en: 'Confirm Delete',
    zh: '确认删除',
  },
  'privacy.deleting': {
    en: 'Deleting...',
    zh: '删除中...',
  },

  // Settings
  'settings.account': {
    en: 'Account',
    zh: '账户',
  },
  'settings.loading': {
    en: 'Loading...',
    zh: '加载中...',
  },
  'settings.signOut': {
    en: 'Sign out',
    zh: '退出登录',
  },
  'settings.credits': {
    en: 'Credits',
    zh: '积分',
  },
  'settings.unlimited': {
    en: 'Unlimited',
    zh: '无限',
  },
  'settings.renews': {
    en: 'renews',
    zh: '续期',
  },
  'settings.buyCredits': {
    en: 'Buy Credits',
    zh: '购买积分',
  },
  'settings.loginDesc': {
    en: 'Sign in to manage your credits and use premium features.',
    zh: '登录以管理您的积分和使用高级功能。',
  },
  'settings.login': {
    en: 'Sign In',
    zh: '登录账户',
  },
  'settings.loggingIn': {
    en: 'Signing in...',
    zh: '登录中...',
  },
  'settings.noAccountNeeded': {
    en: 'Local fill features available without account',
    zh: '不登录也可使用本地填充功能',
  },
  'settings.llm.title': {
    en: 'LLM Classification',
    zh: 'LLM 分类',
  },
  'settings.llm.desc': {
    en: 'Use AI to classify ambiguous form fields. Requires API key.',
    zh: '使用 AI 对模糊的表单字段进行分类。需要 API 密钥。',
  },
  'settings.llm.provider': {
    en: 'Provider',
    zh: '提供商',
  },
  'settings.llm.apiKey': {
    en: 'API Key',
    zh: 'API 密钥',
  },
  'settings.llm.model': {
    en: 'Model',
    zh: '模型',
  },
  'settings.llm.modelPlaceholder': {
    en: 'Select or type model name',
    zh: '选择或输入模型名称',
  },
  'settings.llm.modelHint': {
    en: 'Select from list or type custom model name',
    zh: '从列表中选择或输入自定义模型名称',
  },
  'settings.llm.modelName': {
    en: 'Model Name',
    zh: '模型名称',
  },
  'settings.llm.endpoint': {
    en: 'Endpoint URL',
    zh: '接口地址',
  },
  'settings.llm.disableThinking': {
    en: 'Disable Thinking Mode',
    zh: '禁用思考模式',
  },
  'settings.llm.disableThinkingDesc': {
    en: 'Turn off deep reasoning for faster responses (required for some models)',
    zh: '关闭深度推理以加快响应速度（某些模型需要）',
  },
  'settings.save': {
    en: 'Save Settings',
    zh: '保存设置',
  },
  'settings.saving': {
    en: 'Saving...',
    zh: '保存中...',
  },
  'settings.saved': {
    en: 'Saved',
    zh: '已保存',
  },
  'settings.about': {
    en: 'About',
    zh: '关于',
  },
  'settings.aboutDesc': {
    en: 'Smart form auto-filler for job applications.',
    zh: '智能求职表单自动填充工具。',
  },
  'settings.typingAnimation': {
    en: 'Typing Animation',
    zh: '打字动画',
  },
  'settings.typingAnimationDesc': {
    en: 'Show typewriter effect when filling forms',
    zh: '填充表单时显示打字机效果',
  },
  'settings.devMode': {
    en: 'Developer Mode',
    zh: '开发者模式',
  },
  'settings.devModeDesc': {
    en: 'Enable developer tools tab',
    zh: '启用开发者工具选项卡',
  },
  'settings.aiEnhancement': {
    en: 'AI Enhancement',
    zh: 'AI 增强',
  },
  'settings.aiEnhancementDesc': {
    en: 'Use AI to better recognize complex form fields',
    zh: '使用 AI 更好地识别复杂表单字段',
  },
  'settings.aiEnhancementLoginRequired': {
    en: 'Login required to use AI features',
    zh: '需要登录才能使用 AI 功能',
  },
  'settings.usingBackendApi': {
    en: 'Using cloud API (included in your plan)',
    zh: '使用云端 API（已包含在您的套餐中）',
  },
  'settings.useCustomApi': {
    en: 'Use Custom LLM API',
    zh: '使用自定义 LLM API',
  },
  'settings.useCustomApiDesc': {
    en: 'Use your own API key instead of backend service',
    zh: '使用自己的 API 密钥而非后端服务',
  },

  // Saved Answers
  'answers.search': {
    en: 'Search...',
    zh: '搜索...',
  },
  'answers.noSaved': {
    en: 'No saved answers',
    zh: '没有保存的答案',
  },
  'answers.noSavedDesc': {
    en: 'Fill out forms to save your answers automatically.',
    zh: '填写表单以自动保存您的答案。',
  },
  'answers.workExperience': {
    en: 'Work Experience',
    zh: '工作经历',
  },
  'answers.educationExperience': {
    en: 'Education',
    zh: '教育经历',
  },
  'answers.personal': {
    en: 'Personal',
    zh: '个人信息',
  },
  'answers.education': {
    en: 'Education',
    zh: '教育',
  },
  'answers.sensitive': {
    en: 'Sensitive',
    zh: '敏感信息',
  },
  'answers.noAutoFill': {
    en: 'no auto-fill',
    zh: '不自动填充',
  },
  'answers.noItems': {
    en: 'No items in this category',
    zh: '此分类下没有项目',
  },
  'answers.noWorkExp': {
    en: 'No work experiences',
    zh: '没有工作经历',
  },
  'answers.noEduExp': {
    en: 'No education experiences',
    zh: '没有教育经历',
  },
  'answers.auto': {
    en: 'Auto',
    zh: '自动',
  },
  'answers.edit': {
    en: 'Edit',
    zh: '编辑',
  },
  'answers.delete': {
    en: 'Delete',
    zh: '删除',
  },
  'answers.save': {
    en: 'Save',
    zh: '保存',
  },
  'answers.deleteConfirm': {
    en: 'Delete this answer?',
    zh: '删除此答案？',
  },
  'answers.deleteExpConfirm': {
    en: 'Delete this experience?',
    zh: '删除此经历？',
  },
  'answers.untitledPosition': {
    en: 'Untitled Position',
    zh: '未命名职位',
  },
  'answers.untitledEducation': {
    en: 'Untitled Education',
    zh: '未命名教育',
  },
  'answers.present': {
    en: 'Present',
    zh: '至今',
  },

  // Floating Widget
  'widget.save': {
    en: 'Save',
    zh: '保存',
  },
  'widget.fill': {
    en: 'Fill',
    zh: '填充',
  },
  'widget.manageDb': {
    en: 'Manage Database',
    zh: '管理数据库',
  },
  'widget.closePanel': {
    en: 'Close Panel',
    zh: '关闭面板',
  },
  'widget.learned': {
    en: 'I just learned these:',
    zh: '我刚学到了这些：',
  },
  'widget.editHint': {
    en: '(Edit values and types, then confirm)',
    zh: '(编辑值和类型，然后确认)',
  },
  'widget.willReplace': {
    en: 'Will replace:',
    zh: '将替换：',
  },
  'widget.sensitive': {
    en: '(sensitive)',
    zh: '(敏感)',
  },
  'widget.cancel': {
    en: 'Cancel',
    zh: '取消',
  },
  'widget.confirm': {
    en: 'Confirm',
    zh: '确认',
  },
  'widget.savedToDb': {
    en: 'Saved to Database!',
    zh: '已保存到数据库！',
  },
  'widget.savedDesc': {
    en: 'Your answers have been saved and will be used for auto-filling.',
    zh: '您的答案已保存，将用于自动填充。',
  },
  'widget.viewEditDb': {
    en: 'View/Edit Database',
    zh: '查看/编辑数据库',
  },
  'widget.done': {
    en: 'Done',
    zh: '完成',
  },
  'widget.database': {
    en: 'Database',
    zh: '数据库',
  },
  'widget.openSidePanel': {
    en: 'Open the side panel for full database management.',
    zh: '打开侧边栏以进行完整的数据库管理。',
  },
  'widget.clickExtIcon': {
    en: 'Click the extension icon → Open Side Panel',
    zh: '点击扩展图标 → 打开侧边栏',
  },
  'widget.filling': {
    en: 'Filling...',
    zh: '填充中...',
  },
  'widget.preparing': {
    en: 'Preparing...',
    zh: '准备中...',
  },
  'widget.scanning': {
    en: 'Scanning',
    zh: '扫描中',
  },
  'widget.thinking': {
    en: 'Thinking',
    zh: '思考中',
  },
  'widget.complete': {
    en: 'Complete!',
    zh: '完成！',
  },
  'widget.processing': {
    en: 'Processing...',
    zh: '处理中...',
  },
  'widget.allFieldsFilled': {
    en: 'All fields filled!',
    zh: '所有字段已填充！',
  },
  'widget.fieldOf': {
    en: 'Field {current} of {total}',
    zh: '字段 {current}/{total}',
  },

  // AI Promotion Bubble
  'aiPromo.title': {
    en: 'Enable AI to fill more fields',
    zh: '启用 AI 可填充更多字段',
  },
  'aiPromo.thisFill': {
    en: 'This fill:',
    zh: '本次填充:',
  },
  'aiPromo.fields': {
    en: '{filled}/{total} fields ({rate}%)',
    zh: '{filled}/{total} 个字段 ({rate}%)',
  },
  'aiPromo.withAi': {
    en: 'With AI:',
    zh: '启用 AI 后:',
  },
  'aiPromo.canRecognize': {
    en: 'Can recognize ~95% fields',
    zh: '可识别 ~95% 字段',
  },
  'aiPromo.benefit1': {
    en: 'Smarter field recognition',
    zh: '更智能的字段识别',
  },
  'aiPromo.benefit2': {
    en: 'Support complex dropdowns',
    zh: '支持复杂下拉框',
  },
  'aiPromo.benefit3': {
    en: 'Auto-learn new forms',
    zh: '自动学习新表单',
  },
  'aiPromo.dismiss': {
    en: "Don't remind for 3 days",
    zh: '3天内不再提醒',
  },
  'aiPromo.tryAi': {
    en: 'Enable AI Features',
    zh: '启用 AI 功能',
  },
  'aiPromo.privacy': {
    en: 'Only field labels are sent, not your data',
    zh: '仅发送字段标签，不发送您的数据',
  },

  // Toast messages
  'toast.filled': {
    en: 'Filled {count} fields successfully!',
    zh: '成功填充 {count} 个字段！',
  },
  'toast.noFieldsDetected': {
    en: 'No filled fields detected',
    zh: '未检测到已填充的字段',
  },
  'toast.errorDetecting': {
    en: 'Error detecting fields',
    zh: '检测字段时出错',
  },
  'toast.errorFilling': {
    en: 'Error filling fields',
    zh: '填充字段时出错',
  },
  'toast.errorSaving': {
    en: 'Error saving fields',
    zh: '保存字段时出错',
  },
  'toast.extensionUpdated': {
    en: 'Extension updated. Please refresh the page.',
    zh: '扩展已更新。请刷新页面。',
  },
  'toast.saved': {
    en: 'Saved: {details}',
    zh: '已保存: {details}',
  },
  'toast.new': {
    en: '{count} new',
    zh: '{count} 个新增',
  },
  'toast.replaced': {
    en: '{count} replaced',
    zh: '{count} 个替换',
  },
  'toast.noNewFields': {
    en: 'No new fields to save ({count} skipped as UNKNOWN)',
    zh: '没有新字段需要保存（{count} 个因为未知类型被跳过）',
  },
  'toast.allInDb': {
    en: 'All fields already in database',
    zh: '所有字段已在数据库中',
  },
  'toast.autoFilled': {
    en: 'Auto-filled {count} new field(s)',
    zh: '自动填充了 {count} 个新字段',
  },
  'toast.filledInSection': {
    en: 'Filled {count} fields in new {section} entry',
    zh: '在新的{section}条目中填充了 {count} 个字段',
  },
  'toast.sidePanelHint': {
    en: 'Click extension icon to open side panel',
    zh: '点击扩展图标以打开侧边栏',
  },
  'toast.sidePanelNotAvailable': {
    en: 'Side panel not available',
    zh: '侧边栏不可用',
  },

  // Fill debug reasons
  'debug.autofillDisabled': {
    en: 'Autofill is disabled for this site. Enable it in settings.',
    zh: '此网站的自动填充已禁用。请在设置中启用。',
  },
  'debug.noFields': {
    en: 'No form fields found on this page.',
    zh: '此页面上未找到表单字段。',
  },
  'debug.unknownTypes': {
    en: 'Found {count} fields but couldn\'t identify their types.',
    zh: '找到 {count} 个字段，但无法识别其类型。',
  },
  'debug.noAnswers': {
    en: 'Found {count} fields but no matching answers in database. Save some answers first.',
    zh: '找到 {count} 个字段，但数据库中没有匹配的答案。请先保存一些答案。',
  },
  'debug.manualSelection': {
    en: 'Found {count} fields requiring manual selection (see badges).',
    zh: '找到 {count} 个需要手动选择的字段（请查看标记）。',
  },
  'debug.noMatch': {
    en: 'No matching fields found. Check console for debug details.',
    zh: '未找到匹配的字段。请查看控制台了解详情。',
  },
} as const

export type MessageKey = keyof typeof messages

/**
 * Get translated message
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const msg = messages[key]
  if (!msg) {
    console.warn(`Missing translation key: ${key}`)
    return key as string
  }

  let text: string = msg[currentLocale] || msg.en

  // Replace parameters
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }

  return text
}

/**
 * React hook for i18n (returns current locale for re-render)
 */
export function useLocale(): Locale {
  return currentLocale
}
