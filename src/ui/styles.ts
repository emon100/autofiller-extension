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

.af-animate-fadeIn { animation: af-fadeIn 0.3s ease-out forwards; }
.af-animate-slideIn { animation: af-slideIn 0.3s ease-out forwards; }
.af-animate-slideOut { animation: af-slideOut 0.3s ease-in forwards; }
.af-animate-toastIn { animation: af-toastIn 0.3s ease-out forwards; }
.af-animate-checkBounce { animation: af-checkBounce 0.4s ease-out forwards; }
.af-animate-spin { animation: af-spin 1s linear infinite; }

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
`
