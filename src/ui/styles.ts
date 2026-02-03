export const WIDGET_STYLES = `
@keyframes af-fadeIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes af-slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes af-slideOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(20px); }
}
@keyframes af-toastIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes af-checkBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@keyframes af-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes af-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes af-typing {
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}
@keyframes af-stageIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes af-progressFill {
  from { width: 0%; }
  to { width: 100%; }
}
@keyframes af-dotBounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.af-animate-fadeIn { animation: af-fadeIn 0.3s ease-out forwards; }
.af-animate-slideIn { animation: af-slideIn 0.3s ease-out forwards; }
.af-animate-slideOut { animation: af-slideOut 0.3s ease-in forwards; }
.af-animate-toastIn { animation: af-toastIn 0.3s ease-out forwards; }
.af-animate-checkBounce { animation: af-checkBounce 0.4s ease-out forwards; }
.af-animate-spin { animation: af-spin 1s linear infinite; }
.af-animate-pulse { animation: af-pulse 1.5s ease-in-out infinite; }
.af-animate-typing { animation: af-typing 1s ease-in-out infinite; }
.af-animate-stageIn { animation: af-stageIn 0.3s ease-out forwards; }

.af-dot-bounce {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  animation: af-dotBounce 1.4s infinite ease-in-out both;
}
.af-dot-bounce:nth-child(1) { animation-delay: -0.32s; }
.af-dot-bounce:nth-child(2) { animation-delay: -0.16s; }
.af-dot-bounce:nth-child(3) { animation-delay: 0s; }

.af-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.af-widget * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.af-widget button {
  cursor: pointer;
  border: none;
  background: none;
  font-family: inherit;
}

.af-hidden { display: none !important; }

.af-scrollbar::-webkit-scrollbar { width: 5px; }
.af-scrollbar::-webkit-scrollbar-track { background: transparent; }
.af-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
.af-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

.af-btn-hover { transition: transform 0.15s; }
.af-btn-hover:hover { transform: scale(1.02); }
.af-btn-hover:active { transform: scale(0.98); }

.af-toast-container {
  position: fixed;
  bottom: 100px;
  right: 24px;
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.af-toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  color: white;
  font-size: 14px;
}

.af-toast-success { background: #16a34a; }
.af-toast-warning { background: #f59e0b; }
.af-toast-info { background: #1f2937; }

.af-filling-popup {
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  border-radius: 16px;
  box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
  border: 1px solid rgba(129, 140, 248, 0.3);
  width: 280px;
  overflow: hidden;
  color: white;
}

.af-filling-header {
  padding: 20px 20px 16px;
  text-align: center;
}

.af-filling-stage {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 8px;
  min-height: 32px;
}

.af-filling-field {
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  min-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.af-filling-progress {
  padding: 0 20px 20px;
}

.af-progress-bar {
  height: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
  overflow: hidden;
}

.af-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #818cf8, #c084fc);
  border-radius: 3px;
  transition: width 0.1s ease-out;
}

.af-filling-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 11px;
  color: rgba(255,255,255,0.6);
}
`
