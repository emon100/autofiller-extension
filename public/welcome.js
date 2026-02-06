var isZh = (navigator.language || '').toLowerCase().startsWith('zh')

if (isZh) {
  document.getElementById('title').textContent = '欢迎使用 OneFillr'
  document.getElementById('subtitle').textContent = '秒速自动填写求职申请，数据安全存储在本地。'
  document.getElementById('badge1').textContent = '本地存储'
  document.getElementById('badge2').textContent = 'AI 可选'
  document.getElementById('badge3').textContent = '简历导入'
  document.getElementById('ctaDesc').textContent = '点击下方按钮打开设置面板，开始配置您的个人资料。'
  document.getElementById('ctaText').textContent = '打开设置面板'
  document.getElementById('feat1t').textContent = '极速填写'
  document.getElementById('feat1d').textContent = '2-3 秒填完整个表单'
  document.getElementById('feat2t').textContent = '隐私优先'
  document.getElementById('feat2d').textContent = '所有数据本地存储'
  document.getElementById('feat3t').textContent = '自动学习'
  document.getElementById('feat3d').textContent = '从您的输入中学习'
  document.getElementById('feat4t').textContent = '智能匹配'
  document.getElementById('feat4d').textContent = '适用于所有求职网站'
  document.getElementById('footer').textContent = '您随时可以通过点击工具栏中的图标来使用 OneFillr。'
  document.getElementById('pinTitle').textContent = '固定 OneFillr 以便快速访问'
  document.getElementById('pinSubtitle').textContent = '将 OneFillr 固定到浏览器工具栏，一键即可使用。'
  document.getElementById('pinStep1').innerHTML = '点击工具栏中的<strong>拼图图标</strong>'
  document.getElementById('pinStep2').innerHTML = '找到 <strong>OneFillr</strong>，点击<strong>固定</strong>图标'
  document.getElementById('pinAlt').innerHTML = '也可以：右键点击任意表单字段，在菜单中选择 <strong>OneFillr</strong>。'
}

function openPanel() {
  var btn = document.getElementById('ctaBtn')
  btn.disabled = true
  document.getElementById('ctaText').textContent = isZh ? '正在打开...' : 'Opening...'

  chrome.runtime.sendMessage({ action: 'openSidePanel' }, function(response) {
    if (response && response.success) {
      // Hide welcome sections, show pin guide as main content
      document.getElementById('heroSection').classList.add('section-hidden')
      document.getElementById('ctaSection').classList.add('section-hidden')
      document.getElementById('featuresSection').classList.add('section-hidden')
      document.getElementById('footer').classList.add('section-hidden')

      // Show success badge
      var badge = document.getElementById('panelOpenedBadge')
      badge.classList.remove('section-hidden')
      document.getElementById('panelOpenedText').textContent = isZh
        ? '侧边栏已打开！接下来固定扩展图标：'
        : 'Side panel opened! Now pin the extension:'

      // Make pin guide prominent
      document.getElementById('pinGuide').classList.add('pin-guide-hero')
    } else {
      btn.disabled = false
      document.getElementById('ctaText').textContent = isZh ? '打开设置面板' : 'Open Setup Panel'
      var hint = document.getElementById('fallbackHint')
      hint.classList.add('show')
      document.getElementById('fallbackText').innerHTML = isZh
        ? '请点击浏览器工具栏中的 <span class="icon-hint"><img src="icons/icon128.png" alt="" width="14" height="14" style="border-radius:3px"></span> 图标打开侧边栏'
        : 'Click the <span class="icon-hint"><img src="icons/icon128.png" alt="" width="14" height="14" style="border-radius:3px"></span> icon in your toolbar to open the side panel'
    }
  })
}

document.getElementById('ctaBtn').addEventListener('click', openPanel)
