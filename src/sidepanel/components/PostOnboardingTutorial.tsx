import { useState, useEffect } from 'react'
import { BookOpen, ArrowRight, CheckCircle, MousePointer2 } from 'lucide-react'

const STORAGE_KEY = 'tutorialCompleted'

/* ──────────────────────────────────────────
   Step 1: Fill Demo — animated cursor + mini form
   ────────────────────────────────────────── */
function FillDemoStep({ onTried }: { onTried: () => void }) {
    const [animPhase, setAnimPhase] = useState<'idle' | 'moving' | 'clicking' | 'filling' | 'done'>('idle')
    const [demoFilled, setDemoFilled] = useState(false)
    const [formValues, setFormValues] = useState({ name: '', email: '', phone: '' })

    // Animated demo — auto-play on mount
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = []
        timers.push(setTimeout(() => setAnimPhase('moving'), 600))
        timers.push(setTimeout(() => setAnimPhase('clicking'), 1800))
        timers.push(setTimeout(() => setAnimPhase('filling'), 2200))
        timers.push(setTimeout(() => setAnimPhase('done'), 3200))
        return () => timers.forEach(clearTimeout)
    }, [])

    function handleFillDemo() {
        if (demoFilled) return
        setDemoFilled(true)
        // Typewriter fill effect
        const target = { name: 'John Doe', email: 'john@example.com', phone: '555-0123' }
        let i = 0
        const interval = setInterval(() => {
            i++
            setFormValues({
                name: target.name.slice(0, Math.min(i * 2, target.name.length)),
                email: target.email.slice(0, Math.min(i * 2, target.email.length)),
                phone: target.phone.slice(0, Math.min(i * 2, target.phone.length)),
            })
            if (i * 2 >= Math.max(target.name.length, target.email.length, target.phone.length)) {
                clearInterval(interval)
                onTried()
            }
        }, 60)
    }

    return (
        <div className="space-y-4">
            {/* Animated preview */}
            <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 h-[120px] overflow-hidden border border-gray-200">
                {/* Fake floating widget */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-700">3 fields</span>
                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white transition-all ${animPhase === 'clicking' ? 'bg-blue-700 scale-95' : 'bg-blue-500'}`}>
                        Fill
                    </div>
                </div>

                {/* Fake form fields in background */}
                <div className="space-y-1.5">
                    <div className={`h-5 rounded bg-white border border-gray-200 transition-colors duration-500 ${animPhase === 'filling' || animPhase === 'done' ? 'border-green-300 bg-green-50' : ''}`}>
                        <div className="px-2 text-[8px] text-gray-400 leading-5">{animPhase === 'filling' || animPhase === 'done' ? 'John Doe' : 'Full Name'}</div>
                    </div>
                    <div className={`h-5 rounded bg-white border border-gray-200 transition-colors duration-500 delay-100 ${animPhase === 'filling' || animPhase === 'done' ? 'border-green-300 bg-green-50' : ''}`}>
                        <div className="px-2 text-[8px] text-gray-400 leading-5">{animPhase === 'filling' || animPhase === 'done' ? 'john@example.com' : 'Email'}</div>
                    </div>
                    <div className={`h-5 rounded bg-white border border-gray-200 transition-colors duration-500 delay-200 ${animPhase === 'filling' || animPhase === 'done' ? 'border-green-300 bg-green-50' : ''}`}>
                        <div className="px-2 text-[8px] text-gray-400 leading-5">{animPhase === 'filling' || animPhase === 'done' ? '555-0123' : 'Phone'}</div>
                    </div>
                </div>

                {/* Animated cursor */}
                <div
                    className="absolute transition-all duration-1000 ease-in-out pointer-events-none"
                    style={{
                        opacity: animPhase === 'idle' ? 0 : animPhase === 'done' ? 0 : 1,
                        bottom: animPhase === 'idle' ? '50px' : animPhase === 'moving' ? '18px' : '18px',
                        right: animPhase === 'idle' ? '80px' : animPhase === 'moving' ? '14px' : '14px',
                        transform: animPhase === 'clicking' ? 'scale(0.85)' : 'scale(1)',
                    }}
                >
                    <MousePointer2 className="w-5 h-5 text-gray-800 drop-shadow-md" style={{ fill: 'white' }} />
                </div>

                {/* Success check */}
                {animPhase === 'done' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                        <div className="flex items-center gap-1.5 bg-green-500 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-lg animate-bounce">
                            <CheckCircle className="w-3.5 h-3.5" /> 3 fields filled!
                        </div>
                    </div>
                )}
            </div>

            {/* Interactive mini form */}
            <div className="border border-dashed border-blue-300 rounded-xl p-3 bg-blue-50/30">
                <p className="text-[11px] font-medium text-blue-600 mb-2 text-center">👆 Try it! Click "Fill" below</p>
                <div className="space-y-1.5">
                    <input
                        readOnly
                        value={formValues.name}
                        placeholder="Full Name"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 outline-none"
                    />
                    <input
                        readOnly
                        value={formValues.email}
                        placeholder="Email"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 outline-none"
                    />
                    <input
                        readOnly
                        value={formValues.phone}
                        placeholder="Phone"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 outline-none"
                    />
                </div>
                <button
                    onClick={handleFillDemo}
                    disabled={demoFilled}
                    className={`mt-2 w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${demoFilled ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600 active:scale-[0.98]'
                        }`}
                >
                    {demoFilled ? '✓ Filled!' : '⚡ Fill'}
                </button>
            </div>
        </div>
    )
}

/* ──────────────────────────────────────────
   Step 2: Learn Mode — simple info (no demo)
   ────────────────────────────────────────── */
function LearnModeStep() {
    return (
        <div className="space-y-3 text-center">
            <div className="w-14 h-14 mx-auto bg-orange-50 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-orange-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Learn as You Go</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
                With Learn Mode on, the extension watches as you fill forms manually and remembers your answers for next time.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg py-2 px-3">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Learn Mode is <strong>enabled</strong> by default</span>
            </div>
        </div>
    )
}

/* ──────────────────────────────────────────
   Step 3: Right-Click Demo — animated context menu + input
   ────────────────────────────────────────── */
function RightClickDemoStep({ onTried }: { onTried: () => void }) {
    const [animPhase, setAnimPhase] = useState<'idle' | 'cursor' | 'menu' | 'select' | 'filled'>('idle')
    const [demoValue, setDemoValue] = useState('')
    const [hasTried, setHasTried] = useState(false)

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = []
        timers.push(setTimeout(() => setAnimPhase('cursor'), 500))
        timers.push(setTimeout(() => setAnimPhase('menu'), 1600))
        timers.push(setTimeout(() => setAnimPhase('select'), 3000))
        timers.push(setTimeout(() => setAnimPhase('filled'), 3500))
        return () => timers.forEach(clearTimeout)
    }, [])

    function handleContextMenu(e: React.MouseEvent) {
        e.preventDefault()
        if (hasTried) return
        setHasTried(true)
        // Simulate fill on right-click
        let i = 0
        const target = 'San Francisco, CA'
        const interval = setInterval(() => {
            i++
            setDemoValue(target.slice(0, i))
            if (i >= target.length) {
                clearInterval(interval)
                onTried()
            }
        }, 40)
    }

    return (
        <div className="space-y-4">
            {/* Animated preview */}
            <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 h-[160px] overflow-hidden border border-gray-200">
                {/* Fake form field */}
                <div className="mt-4">
                    <div className="text-[9px] text-gray-500 mb-0.5 ml-0.5">City</div>
                    <div className={`h-6 rounded bg-white border transition-colors duration-500 ${animPhase === 'filled' ? 'border-green-300 bg-green-50' : 'border-gray-300'
                        }`}>
                        <div className="px-2 text-[9px] text-gray-700 leading-6">
                            {animPhase === 'filled' ? 'San Francisco' : ''}
                        </div>
                    </div>
                </div>

                {/* Context menu popup */}
                {(animPhase === 'menu' || animPhase === 'select') && (
                    <div
                        className="absolute bg-white rounded-lg shadow-2xl border border-gray-200 py-1 text-[9px] w-[120px] animate-in fade-in"
                        style={{ top: '42px', left: '90px' }}
                    >
                        <div className="px-2.5 py-1 text-gray-500 hover:bg-gray-50">Cut</div>
                        <div className="px-2.5 py-1 text-gray-500 hover:bg-gray-50">Copy</div>
                        <div className="px-2.5 py-1 text-gray-500 hover:bg-gray-50">Paste</div>
                        <div className="border-t border-gray-100 my-0.5" />
                        <div className={`px-2.5 py-1 flex items-center gap-1.5 transition-colors ${animPhase === 'select' ? 'bg-blue-500 text-white' : 'text-gray-700'
                            }`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                            1Fillr
                        </div>
                    </div>
                )}

                {/* Animated cursor */}
                <div
                    className="absolute transition-all ease-in-out pointer-events-none"
                    style={{
                        opacity: animPhase === 'idle' ? 0 : animPhase === 'filled' ? 0 : 1,
                        top: animPhase === 'idle' ? '30px' : animPhase === 'cursor' ? '52px' : animPhase === 'select' ? '105px' : '52px',
                        left: animPhase === 'idle' ? '40px' : animPhase === 'cursor' ? '80px' : animPhase === 'select' ? '140px' : '80px',
                        transitionDuration: animPhase === 'cursor' ? '800ms' : '400ms',
                    }}
                >
                    <MousePointer2 className="w-5 h-5 text-gray-800 drop-shadow-md" style={{ fill: 'white' }} />
                </div>

                {/* Success badge */}
                {animPhase === 'filled' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                        <div className="flex items-center gap-1.5 bg-green-500 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-lg animate-bounce">
                            <CheckCircle className="w-3.5 h-3.5" /> Field filled!
                        </div>
                    </div>
                )}
            </div>

            {/* Interactive right-click demo */}
            <div className="border border-dashed border-purple-300 rounded-xl p-3 bg-purple-50/30">
                <p className="text-[11px] font-medium text-purple-600 mb-2 text-center">👆 Try it! Right-click the input below</p>
                <div className="text-[10px] text-gray-500 mb-0.5 ml-0.5">City</div>
                <input
                    readOnly
                    value={demoValue}
                    placeholder="Right-click here..."
                    onContextMenu={handleContextMenu}
                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white outline-none transition-colors cursor-context-menu ${hasTried ? 'border-green-300 bg-green-50 text-gray-800' : 'border-purple-200 text-gray-800 placeholder-gray-400 hover:border-purple-400'
                        }`}
                />
                {hasTried && (
                    <p className="text-[10px] text-green-600 text-center mt-1.5 font-medium">✓ Nice! On real pages, this opens the 1Fillr menu.</p>
                )}
            </div>
        </div>
    )
}

/* ──────────────────────────────────────────
   Main Tutorial Component
   ────────────────────────────────────────── */
export default function PostOnboardingTutorial({ onDone }: { onDone: () => void }) {
    const [currentStep, setCurrentStep] = useState(0)
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        chrome.storage.local.get(STORAGE_KEY).then(result => {
            if (result[STORAGE_KEY]) {
                setVisible(false)
                onDone()
            }
        })
    }, [])

    function handleNext() {
        if (currentStep < 2) {
            setCurrentStep(currentStep + 1)
        } else {
            handleDone()
        }
    }

    function handleDone() {
        chrome.storage.local.set({ [STORAGE_KEY]: true })
        setVisible(false)
        onDone()
    }

    if (!visible) return null

    const isLast = currentStep === 2
    const STEP_TITLES = ['Fill Forms Instantly', 'Learn as You Go', 'Right-Click to Fill']

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">You're all set! 🎉</h2>
                <p className="text-sm text-gray-500 mt-1">Here's how to get the most out of 1Fillr</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    {STEP_TITLES.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-8 bg-blue-500' : i < currentStep ? 'w-4 bg-blue-200' : 'w-4 bg-gray-200'
                                }`}
                        />
                    ))}
                </div>

                {/* Step title */}
                <h3 className="text-sm font-semibold text-gray-900 text-center mb-3">{STEP_TITLES[currentStep]}</h3>

                {/* Step content */}
                {currentStep === 0 && <FillDemoStep onTried={() => { }} />}
                {currentStep === 1 && <LearnModeStep />}
                {currentStep === 2 && <RightClickDemoStep onTried={() => { }} />}

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <button
                        onClick={handleDone}
                        className="text-xs text-gray-400 hover:text-gray-600"
                    >
                        Skip tutorial
                    </button>
                    <button
                        onClick={handleNext}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {isLast ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Done!
                            </>
                        ) : (
                            <>
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
