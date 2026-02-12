import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChefHat,
  X,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Clock,
  Flame,
  Check,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Timer,
  Zap,
  Brain,
  Radio,
} from 'lucide-react'

// ============================================================================
// Live Cooking Coach - Real-time AI-powered cooking assistance
// With Voice Activity Detection (VAD) for natural interruption
// ============================================================================

export default function LiveCookingCoach({ recipe, onExit }) {
  // Camera state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisInterval, setAnalysisInterval] = useState(3000)
  const [autoAnalyze, setAutoAnalyze] = useState(true)
  const [lastAnalysis, setLastAnalysis] = useState(null)
  const [analysisHistory, setAnalysisHistory] = useState([])
  const analysisIntervalRef = useRef(null)

  // Voice state
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Voice Activity Detection (VAD) state
  const [vadEnabled, setVadEnabled] = useState(true)
  const [vadActive, setVadActive] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const vadStreamRef = useRef(null)
  const vadContextRef = useRef(null)
  const vadAnalyzerRef = useRef(null)
  const vadAnimationRef = useRef(null)
  const silenceTimeoutRef = useRef(null)
  const isRecordingRef = useRef(false)

  // VAD configuration - increased threshold to avoid false triggers
  const VAD_THRESHOLD = 35 // Audio level threshold to trigger listening (higher = less sensitive)
  const SILENCE_TIMEOUT = 1500 // ms of silence before stopping recording
  const MIN_SPEECH_DURATION = 500 // Minimum ms of speech before processing

  // Cooking context state
  const [currentStep, setCurrentStep] = useState(0)
  const [cookingContext, setCookingContext] = useState({
    detectedIngredients: [],
    currentAction: null,
    warnings: [],
    tips: [],
  })

  // Messages/guidance
  const [messages, setMessages] = useState([])

  // Settings
  const [showSettings, setShowSettings] = useState(false)

  // Parse recipe instructions
  const instructions = recipe?.instructions?.split('\n').filter(line => line.trim()) || []
  const currentInstruction = instructions[currentStep]?.replace(/^\d+\.\s*/, '') || ''

  // ============================================================================
  // Voice Activity Detection (VAD) - Interrupt AI when user speaks
  // ============================================================================

  const startVAD = async () => {
    try {
      // Get microphone access for VAD
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      vadStreamRef.current = stream

      // Create audio context and analyzer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      vadContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 512
      analyzer.smoothingTimeConstant = 0.4
      source.connect(analyzer)
      vadAnalyzerRef.current = analyzer

      // Start monitoring audio levels
      monitorAudioLevel()
      setVadActive(true)
      console.log('VAD started - listening for interruptions')

    } catch (err) {
      console.error('VAD error:', err)
      setVadActive(false)
    }
  }

  const stopVAD = () => {
    if (vadAnimationRef.current) {
      cancelAnimationFrame(vadAnimationRef.current)
    }
    if (vadStreamRef.current) {
      vadStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (vadContextRef.current) {
      vadContextRef.current.close()
    }
    setVadActive(false)
    console.log('VAD stopped')
  }

  const monitorAudioLevel = () => {
    if (!vadAnalyzerRef.current) return

    const analyzer = vadAnalyzerRef.current
    const dataArray = new Uint8Array(analyzer.frequencyBinCount)
    let consecutiveHighFrames = 0
    const REQUIRED_HIGH_FRAMES = 5 // Require ~5 frames of high audio before triggering

    const checkLevel = () => {
      analyzer.getByteFrequencyData(dataArray)
      
      // Calculate average audio level
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      setAudioLevel(average)

      // Require sustained audio above threshold (debounce)
      if (average > VAD_THRESHOLD) {
        consecutiveHighFrames++
      } else {
        consecutiveHighFrames = 0
      }

      // Voice detected - only trigger after sustained speech
      if (consecutiveHighFrames >= REQUIRED_HIGH_FRAMES && !isRecordingRef.current && !isProcessing) {
        consecutiveHighFrames = 0 // Reset counter
        handleVoiceDetected()
      }

      // Continue monitoring
      vadAnimationRef.current = requestAnimationFrame(checkLevel)
    }

    checkLevel()
  }

  const handleVoiceDetected = () => {
    console.log('Voice detected - interrupting AI')
    
    // Stop AI from speaking immediately
    if (isSpeaking) {
      stopAudio()
    }

    // Start recording
    startRecordingFromVAD()
  }

  const startRecordingFromVAD = async () => {
    if (isRecordingRef.current || isProcessing) return

    try {
      isRecordingRef.current = true
      setIsListening(true)
      const recordingStartTime = Date.now()

      // Use the VAD stream for recording
      if (!vadStreamRef.current) return

      // Use the best available audio codec for better transcription quality
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4'
      
      const mediaRecorder = new MediaRecorder(vadStreamRef.current, { 
        mimeType,
        audioBitsPerSecond: 128000 // Higher bitrate for better quality
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const recordingDuration = Date.now() - recordingStartTime
        isRecordingRef.current = false
        setIsListening(false)
        
        // Only process if we have meaningful audio AND sufficient duration
        // This prevents false triggers from noise spikes
        if (audioBlob.size > 2000 && recordingDuration > MIN_SPEECH_DURATION) {
          console.log(`Processing voice: ${audioBlob.size} bytes, ${recordingDuration}ms`)
          await processVoiceCommand(audioBlob)
        } else {
          console.log(`Ignoring short/empty audio: ${audioBlob.size} bytes, ${recordingDuration}ms`)
        }
      }

      mediaRecorder.start()

      // Monitor for silence to stop recording
      monitorSilence()

    } catch (err) {
      console.error('Recording error:', err)
      isRecordingRef.current = false
      setIsListening(false)
    }
  }

  const monitorSilence = () => {
    if (!vadAnalyzerRef.current) return

    const analyzer = vadAnalyzerRef.current
    const dataArray = new Uint8Array(analyzer.frequencyBinCount)

    const checkSilence = () => {
      if (!isRecordingRef.current) return

      analyzer.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length

      if (average < VAD_THRESHOLD) {
        // Silence detected - start timeout
        if (!silenceTimeoutRef.current) {
          silenceTimeoutRef.current = setTimeout(() => {
            // Stop recording after silence timeout
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop()
            }
            silenceTimeoutRef.current = null
          }, SILENCE_TIMEOUT)
        }
      } else {
        // Voice still active - clear timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
          silenceTimeoutRef.current = null
        }
      }

      if (isRecordingRef.current) {
        requestAnimationFrame(checkSilence)
      }
    }

    checkSilence()
  }

  // Start VAD when component mounts
  useEffect(() => {
    if (vadEnabled) {
      startVAD()
    }
    return () => {
      stopVAD()
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }
  }, [vadEnabled])

  // ============================================================================
  // Camera Functions
  // ============================================================================

  const startCamera = async () => {
    try {
      setCameraError(null)
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      
      setCameraActive(true)
      
      addMessage('assistant', `📸 Camera ready! I can now see your cooking. I'll guide you through ${recipe?.name || 'your dish'}. Just start talking anytime to interrupt me!`)

      if (voiceEnabled && currentInstruction) {
        speakGuidance(`Let's begin! ${currentInstruction}`)
      }

    } catch (err) {
      console.error('Camera error:', err)
      setCameraError(err.message || 'Failed to access camera')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const switchCamera = async () => {
    stopCamera()
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    setTimeout(() => startCamera(), 100)
  }

  // ============================================================================
  // Frame Capture & AI Analysis
  // ============================================================================

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    return canvas.toDataURL('image/jpeg', 0.7)
  }, [])

  const analyzeFrame = useCallback(async () => {
    if (isAnalyzing || !cameraActive) return

    const frameData = captureFrame()
    if (!frameData) return

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/live-cook/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: frameData.split(',')[1],
          recipe_name: recipe?.name || 'Unknown Recipe',
          current_step: currentStep + 1,
          current_instruction: currentInstruction,
          previous_context: cookingContext,
          detected_ingredients: cookingContext.detectedIngredients,
        }),
      })

      if (!response.ok) throw new Error('Analysis failed')

      const data = await response.json()

      if (data.success) {
        setLastAnalysis(data)
        setAnalysisHistory(prev => [...prev.slice(-10), data])

        if (data.detected_ingredients) {
          setCookingContext(prev => ({
            ...prev,
            detectedIngredients: data.detected_ingredients,
          }))
        }

        if (data.guidance) {
          addMessage('assistant', data.guidance)
          if (voiceEnabled && data.speak && !isListening) {
            speakGuidance(data.guidance)
          }
        }

        if (data.warning) {
          addMessage('warning', data.warning)
          if (voiceEnabled && !isListening) {
            speakGuidance(`Warning: ${data.warning}`)
          }
        }

        if (data.step_complete_suggestion) {
          addMessage('assistant', `✅ Looks like you've completed this step! ${data.next_step_preview || 'Ready for the next step?'}`)
        }
      }

    } catch (err) {
      console.error('Analysis error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [isAnalyzing, cameraActive, captureFrame, recipe, currentStep, currentInstruction, cookingContext, voiceEnabled, isListening])

  useEffect(() => {
    if (cameraActive && autoAnalyze) {
      analysisIntervalRef.current = setInterval(() => {
        analyzeFrame()
      }, analysisInterval)
    }

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current)
      }
    }
  }, [cameraActive, autoAnalyze, analysisInterval, analyzeFrame])

  // ============================================================================
  // Voice Functions
  // ============================================================================

  const speakGuidance = async (text) => {
    if (!voiceEnabled || isListening) return

    try {
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.audio_base64) {
          playAudio(data.audio_base64)
        }
      }
    } catch (err) {
      console.error('Speech error:', err)
    }
  }

  const playAudio = (base64Audio) => {
    // Don't play if user is speaking
    if (isListening) return

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    
    audioRef.current.src = `data:audio/mp3;base64,${base64Audio}`
    audioRef.current.onplay = () => setIsSpeaking(true)
    audioRef.current.onended = () => setIsSpeaking(false)
    audioRef.current.onerror = () => setIsSpeaking(false)
    audioRef.current.play().catch(console.error)
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsSpeaking(false)
    }
  }

  // Manual recording (for button press)
  const startManualRecording = async () => {
    if (isRecordingRef.current || isProcessing) return

    // Stop AI speaking
    stopAudio()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimal for speech recognition
        } 
      })
      
      isRecordingRef.current = true
      setIsListening(true)

      // Use the best available audio codec
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        stream.getTracks().forEach(track => track.stop())
        isRecordingRef.current = false
        setIsListening(false)
        await processVoiceCommand(audioBlob)
      }

      mediaRecorder.start()
    } catch (err) {
      console.error('Recording error:', err)
      isRecordingRef.current = false
      setIsListening(false)
    }
  }

  const stopManualRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const processVoiceCommand = async (audioBlob) => {
    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'command.webm')

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!transcribeRes.ok) throw new Error('Transcription failed')

      const { text } = await transcribeRes.json()
      if (!text?.trim()) {
        setIsProcessing(false)
        return
      }

      addMessage('user', text)

      const response = await fetch('/api/live-cook/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: text,
          recipe_name: recipe?.name || 'Unknown Recipe',
          current_step: currentStep + 1,
          current_instruction: currentInstruction || '',
          detected_ingredients: cookingContext.detectedIngredients || [],
          last_analysis: lastAnalysis || {},
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.response) {
          addMessage('assistant', data.response)
          if (voiceEnabled) {
            speakGuidance(data.response)
          }
        }

        if (data.action === 'next_step') {
          nextStep()
        } else if (data.action === 'prev_step') {
          prevStep()
        }
      }
    } catch (err) {
      console.error('Voice command error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  const addMessage = (role, content) => {
    setMessages(prev => [...prev.slice(-20), { role, content, timestamp: Date.now() }])
  }

  const nextStep = () => {
    if (currentStep < instructions.length - 1) {
      setCurrentStep(prev => prev + 1)
      const nextInstruction = instructions[currentStep + 1]?.replace(/^\d+\.\s*/, '')
      if (voiceEnabled && nextInstruction) {
        speakGuidance(`Step ${currentStep + 2}: ${nextInstruction}`)
      }
      addMessage('assistant', `📍 Step ${currentStep + 2}: ${nextInstruction}`)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
      const prevInstruction = instructions[currentStep - 1]?.replace(/^\d+\.\s*/, '')
      if (voiceEnabled && prevInstruction) {
        speakGuidance(`Going back. Step ${currentStep}: ${prevInstruction}`)
      }
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera()
      stopAudio()
      stopVAD()
    }
  }, [])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center flex-1 px-4">
            <h2 className="text-white font-semibold truncate">{recipe?.name || 'Live Cooking'}</h2>
            <p className="text-white/60 text-sm">Step {currentStep + 1} of {instructions.length}</p>
          </div>

          <div className="flex gap-2">
            {/* VAD Indicator */}
            {vadActive && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                isListening ? 'bg-red-500' : audioLevel > VAD_THRESHOLD ? 'bg-amber-500' : 'bg-green-500/50'
              }`}>
                <Radio className={`w-3 h-3 text-white ${isListening ? 'animate-pulse' : ''}`} />
                <span className="text-white">
                  {isListening ? 'Listening' : 'VAD'}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--copper-400)] to-[var(--sage-400)] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / instructions.length) * 100}%` }}
          />
        </div>

        {/* Audio Level Indicator */}
        {vadActive && (
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                isListening ? 'bg-red-500' : audioLevel > VAD_THRESHOLD ? 'bg-amber-500' : 'bg-green-500/50'
              }`}
              style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        {cameraActive ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--charcoal)] to-black">
            <div className="text-center p-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--copper-500)] to-[var(--copper-600)] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Camera className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Live Cooking Coach</h3>
              <p className="text-white/60 mb-4 max-w-sm">
                Enable your camera and I'll watch your cooking in real-time.
              </p>
              <p className="text-[var(--copper-400)] text-sm mb-6 max-w-sm">
                💡 Just start talking anytime to interrupt me - I'll stop and listen!
              </p>
              <button
                onClick={startCamera}
                className="px-8 py-4 bg-gradient-to-r from-[var(--copper-500)] to-[var(--copper-600)] text-white rounded-2xl font-semibold flex items-center gap-3 mx-auto hover:from-[var(--copper-600)] hover:to-[var(--copper-700)] transition-all shadow-lg"
              >
                <Camera className="w-5 h-5" />
                Start Camera
              </button>
              {cameraError && (
                <p className="mt-4 text-red-400 text-sm flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {cameraError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis Overlay */}
        {cameraActive && (
          <>
            <div className="absolute top-24 left-4 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isAnalyzing ? 'bg-[var(--copper-500)] animate-pulse' : autoAnalyze ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="text-white/80 text-sm backdrop-blur-sm bg-black/30 px-2 py-1 rounded-lg">
                {isAnalyzing ? 'Analyzing...' : autoAnalyze ? 'AI Active' : 'AI Paused'}
              </span>
            </div>

            {lastAnalysis?.detected_items?.length > 0 && (
              <div className="absolute top-24 right-4 bg-black/50 backdrop-blur-sm rounded-xl p-3 max-w-[200px]">
                <p className="text-white/60 text-xs mb-2 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> I see:
                </p>
                <div className="flex flex-wrap gap-1">
                  {lastAnalysis.detected_items.slice(0, 5).map((item, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white/10 rounded-full text-white text-xs">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Listening indicator overlay */}
            {isListening && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-48 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur-sm rounded-2xl px-6 py-3 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full voice-active-wave"
                        style={{ 
                          animationDelay: `${i * 0.1}s`,
                          height: `${12 + Math.random() * 16}px`
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-white font-medium">I'm listening...</span>
                </div>
              </div>
            )}

            {/* Speaking indicator */}
            {isSpeaking && !isListening && (
              <div className="absolute bottom-48 left-1/2 -translate-x-1/2 bg-[var(--copper-600)]/90 backdrop-blur-sm rounded-2xl px-6 py-3 flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-white animate-pulse" />
                <span className="text-white font-medium">Speaking... (talk to interrupt)</span>
              </div>
            )}
          </>
        )}

        {/* Current Step Card */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-20 pb-32 px-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--copper-500)] to-[var(--copper-600)] flex items-center justify-center text-white font-bold flex-shrink-0">
                {currentStep + 1}
              </div>
              <div className="flex-1">
                <p className="text-white text-lg leading-relaxed">{currentInstruction}</p>
                {lastAnalysis?.tip && (
                  <p className="text-[var(--copper-400)] text-sm mt-2 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    {lastAnalysis.tip}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex-1 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-medium disabled:opacity-30 hover:bg-white/20 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={nextStep}
              disabled={currentStep === instructions.length - 1}
              className="flex-1 py-3 bg-gradient-to-r from-[var(--copper-500)] to-[var(--copper-600)] text-white rounded-xl font-medium hover:from-[var(--copper-600)] hover:to-[var(--copper-700)] transition-all flex items-center justify-center gap-2"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm p-4 safe-area-bottom">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={cameraActive ? stopCamera : startCamera}
            className={`p-4 rounded-full ${cameraActive ? 'bg-red-500' : 'bg-white/10'} text-white`}
          >
            {cameraActive ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
          </button>

          {cameraActive && (
            <button
              onClick={switchCamera}
              className="p-4 rounded-full bg-white/10 text-white"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
          )}

          {/* Voice button - tap to talk (if VAD doesn't work) */}
          <button
            onMouseDown={startManualRecording}
            onMouseUp={stopManualRecording}
            onTouchStart={startManualRecording}
            onTouchEnd={stopManualRecording}
            disabled={isProcessing}
            className={`p-5 rounded-full ${
              isListening 
                ? 'bg-red-500 animate-pulse scale-110' 
                : 'bg-gradient-to-br from-[var(--copper-500)] to-[var(--copper-600)]'
            } text-white shadow-lg transition-all`}
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>

          <button
            onClick={() => {
              setVoiceEnabled(!voiceEnabled)
              if (isSpeaking) stopAudio()
            }}
            className={`p-4 rounded-full ${voiceEnabled ? 'bg-[var(--sage-600)]' : 'bg-white/10'} text-white`}
          >
            {voiceEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>

          <button
            onClick={() => setAutoAnalyze(!autoAnalyze)}
            className={`p-4 rounded-full ${autoAnalyze ? 'bg-[var(--copper-600)]' : 'bg-white/10'} text-white`}
          >
            {autoAnalyze ? <Brain className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Messages Panel */}
      {messages.length > 0 && (
        <div className="absolute top-36 left-4 right-4 max-h-40 overflow-y-auto bg-black/50 backdrop-blur-sm rounded-xl p-3">
          <div className="space-y-2">
            {messages.slice(-5).map((msg, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-white/20 text-white ml-8'
                    : msg.role === 'warning'
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'bg-white/10 text-white/90 mr-8'
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--charcoal-soft)] rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* VAD Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Voice Interruption</p>
                  <p className="text-white/50 text-sm">Talk anytime to interrupt AI</p>
                </div>
                <button
                  onClick={() => setVadEnabled(!vadEnabled)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    vadEnabled ? 'bg-green-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all ${
                    vadEnabled ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Auto AI Analysis</p>
                  <p className="text-white/50 text-sm">Continuously analyze camera</p>
                </div>
                <button
                  onClick={() => setAutoAnalyze(!autoAnalyze)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    autoAnalyze ? 'bg-[var(--copper-500)]' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all ${
                    autoAnalyze ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Analysis Frequency</p>
                  <p className="text-white/50 text-sm">{analysisInterval / 1000} seconds</p>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="1000"
                  value={analysisInterval}
                  onChange={(e) => setAnalysisInterval(Number(e.target.value))}
                  className="w-24"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Voice Guidance</p>
                  <p className="text-white/50 text-sm">Speak instructions aloud</p>
                </div>
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    voiceEnabled ? 'bg-[var(--sage-500)]' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all ${
                    voiceEnabled ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white/5 rounded-xl">
              <p className="text-white/70 text-sm">
                💡 <strong>Tip:</strong> Just start talking anytime and I'll immediately stop speaking and listen to you!
              </p>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-[var(--copper-500)] to-[var(--copper-600)] text-white rounded-xl font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
