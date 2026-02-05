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
}

function openPanel() {
  var btn = document.getElementById('ctaBtn')
  btn.disabled = true
  document.getElementById('ctaText').textContent = isZh ? '正在打开...' : 'Opening...'

  chrome.runtime.sendMessage({ action: 'openSidePanel' }, function(response) {
    if (response && response.success) {
      document.getElementById('ctaText').textContent = isZh ? '已打开！请查看右侧边栏' : 'Opened! Check the side panel'
      btn.style.background = '#16a34a'
      btn.style.boxShadow = '0 2px 8px rgba(22, 163, 74, 0.3)'
    } else {
      btn.disabled = false
      document.getElementById('ctaText').textContent = isZh ? '打开设置面板' : 'Open Setup Panel'
      var hint = document.getElementById('fallbackHint')
      hint.classList.add('show')
      document.getElementById('fallbackText').innerHTML = isZh
        ? '请点击浏览器工具栏中的 <span class="icon-hint"><span class="icon-mock"></span></span> 图标打开侧边栏'
        : 'Click the <span class="icon-hint"><span class="icon-mock"></span></span> icon in your toolbar to open the side panel'
    }
  })
}

document.getElementById('ctaBtn').addEventListener('click', openPanel)
