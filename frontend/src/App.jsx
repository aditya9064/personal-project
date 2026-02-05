import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  ChefHat, 
  Plus, 
  X, 
  Leaf, 
  Globe, 
  Search,
  Clock,
  Flame,
  Camera,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Upload,
  BookOpen,
  Sparkles,
  ArrowRight,
  Check,
  ShoppingCart,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react'

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const [activeTab, setActiveTab] = useState('assistant') // 'assistant', 'cookbook'
  const [recipes, setRecipes] = useState([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  
  // Fetch recipes on mount
  useEffect(() => {
    fetchRecipes()
  }, [])
  
  const fetchRecipes = async () => {
    setLoadingRecipes(true)
    try {
      const response = await fetch('/api/recipes?limit=50')
      if (response.ok) {
        const data = await response.json()
        setRecipes(data)
      }
    } catch (err) {
      console.error('Failed to fetch recipes:', err)
    } finally {
      setLoadingRecipes(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="decorative-blob blob-1" />
      <div className="decorative-blob blob-2" />
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--copper-400)] to-[var(--copper-600)] rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative w-14 h-14 rounded-2xl animate-gradient flex items-center justify-center shadow-xl">
                  <ChefHat className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--charcoal)] serif">
                  Pantry Chef
                </h1>
                <p className="text-xs text-[var(--copper-500)] font-medium tracking-wider uppercase">
                  AI Cooking Companion
                </p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <nav className="flex gap-2 bg-white/60 backdrop-blur-sm p-1.5 rounded-2xl shadow-sm border border-white/80">
              <button
                onClick={() => setActiveTab('assistant')}
                className={`tab-btn ${activeTab === 'assistant' ? 'active' : ''}`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Voice Assistant
                </span>
              </button>
              <button
                onClick={() => setActiveTab('cookbook')}
                className={`tab-btn ${activeTab === 'cookbook' ? 'active' : ''}`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Cookbook
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {activeTab === 'assistant' && (
          <VoiceAssistant recipes={recipes} />
        )}
        {activeTab === 'cookbook' && (
          <CookbookBrowser 
            recipes={recipes} 
            loading={loadingRecipes}
            selectedRecipe={selectedRecipe}
            setSelectedRecipe={setSelectedRecipe}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative mt-20 glass border-t border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--copper-500)] to-[var(--copper-600)] flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-[var(--charcoal-soft)]">
                Powered by <span className="gradient-text-warm font-semibold">OpenAI GPT-4</span>, Whisper & TTS
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--copper-500)]">
              <span>Built with</span>
              <span className="text-xl animate-pulse">❤️</span>
              <span>for home cooks everywhere</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================================================
// Voice Assistant Component
// ============================================================================

function VoiceAssistant({ recipes }) {
  // Ingredients state
  const [ingredients, setIngredients] = useState([])
  const [inputValue, setInputValue] = useState('')
  
  // Image upload state
  const [uploadedImage, setUploadedImage] = useState(null)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fastScanMode, setFastScanMode] = useState(true) // Fast scan by default
  const fileInputRef = useRef(null)
  
  // Voice state
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [conversation, setConversation] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Audio refs
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  
  // Preferences
  const [cuisinePreference, setCuisinePreference] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState([])
  
  // Error state
  const [error, setError] = useState(null)

  // Add an ingredient
  const addIngredient = () => {
    const trimmed = inputValue.trim().toLowerCase()
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed])
      setInputValue('')
    }
  }

  // Remove an ingredient
  const removeIngredient = (ing) => {
    setIngredients(ingredients.filter(i => i !== ing))
  }

  // Handle image upload with detailed analysis
  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setAnalyzingImage(true)
    setError(null)
    
    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setUploadedImage(e.target.result)
    reader.readAsDataURL(file)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Use fast or detailed analysis based on user preference
      const endpoint = fastScanMode ? '/api/vision/analyze-fast' : '/api/vision/analyze-detailed'
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to analyze image')
      }

      const data = await response.json()
      
      if (data.success && data.ingredient_names) {
        // Add detected ingredients
        const newIngredients = [...new Set([...ingredients, ...data.ingredient_names.map(i => i.toLowerCase())])]
        setIngredients(newIngredients)
        
        // Show summary in conversation
        if (data.summary) {
          addToConversation('assistant', `📸 ${data.summary}${data.total_count ? ` I found ${data.total_count} items!` : ''}`)
        }
        
        // Get voice greeting for the ingredients
        if (voiceEnabled && data.ingredient_names.length > 0) {
          await greetWithIngredients(data.ingredient_names)
        }
      } else if (data.success && data.ingredient_names?.length === 0) {
        addToConversation('assistant', "I couldn't detect any food items in this image. Try taking a clearer photo of your fridge or pantry!")
      }
    } catch (err) {
      setError('Failed to analyze image. Please try again.')
      console.error(err)
    } finally {
      setAnalyzingImage(false)
    }
  }

  // Greet with ingredients (voice)
  const greetWithIngredients = async (ingredientList) => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/voice/greet-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ingredientList,
          generate_audio: voiceEnabled,
        }),
      })

      if (response.ok) {
        const data = await response.json()
      if (data.success) {
          addToConversation('assistant', data.text_response)
          if (data.audio_base64 && voiceEnabled) {
            playAudio(data.audio_base64)
          }
        }
      }
    } catch (err) {
      console.error('Failed to greet:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Add message to conversation
  const addToConversation = (role, content) => {
    setConversation(prev => [...prev, { role, content, timestamp: Date.now() }])
  }

  // Play audio from base64
  const playAudio = (base64Audio) => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    
    audioRef.current.src = `data:audio/mp3;base64,${base64Audio}`
    audioRef.current.onplay = () => setIsSpeaking(true)
    audioRef.current.onended = () => setIsSpeaking(false)
    audioRef.current.onerror = () => setIsSpeaking(false)
    audioRef.current.play()
  }

  // Stop audio
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsSpeaking(false)
    }
  }

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await processVoiceInput(audioBlob)
      }

      mediaRecorderRef.current.start()
      setIsListening(true)
    } catch (err) {
      setError('Microphone access denied. Please enable microphone permissions.')
      console.error(err)
    }
  }

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }
  }

  // Process voice input
  const processVoiceInput = async (audioBlob) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Transcribe audio
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')

      const transcribeResponse = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!transcribeResponse.ok) {
        throw new Error('Failed to transcribe audio')
      }

      const transcribeData = await transcribeResponse.json()
      const userMessage = transcribeData.text

      if (!userMessage || userMessage.trim() === '') {
        setIsProcessing(false)
        return
      }

      // Add user message to conversation
      addToConversation('user', userMessage)

      // Get AI response
      const chatResponse = await fetch('/api/voice/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          message: userMessage,
          conversation_history: conversation.map(m => ({
            role: m.role,
            content: m.content,
          })),
          detected_ingredients: ingredients,
          }),
        })

      if (!chatResponse.ok) {
        throw new Error('Failed to get response')
      }

      const chatData = await chatResponse.json()
      
      if (chatData.success) {
        addToConversation('assistant', chatData.text_response)
        if (chatData.audio_base64 && voiceEnabled) {
          playAudio(chatData.audio_base64)
        }
      }
    } catch (err) {
      setError('Failed to process voice input. Please try again.')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Send text message
  const sendTextMessage = async (message) => {
    if (!message.trim()) return
    
    setIsProcessing(true)
    addToConversation('user', message)

    try {
      const response = await fetch('/api/voice/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          message,
          conversation_history: conversation.map(m => ({
            role: m.role,
            content: m.content,
          })),
          detected_ingredients: ingredients,
          }),
        })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          addToConversation('assistant', data.text_response)
          if (data.audio_base64 && voiceEnabled) {
            playAudio(data.audio_base64)
          }
        }
      }
    } catch (err) {
      setError('Failed to send message')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Get recipe suggestions
  const getRecipeSuggestions = async () => {
    if (ingredients.length === 0) {
      setError('Please add some ingredients first')
      return
    }

    setIsProcessing(true)
    addToConversation('user', `What can I make with ${ingredients.join(', ')}?`)

    try {
      const response = await fetch('/api/voice/suggest-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          ingredients,
            cuisine_preference: cuisinePreference || null,
          dietary_restrictions: dietaryRestrictions,
          generate_audio: voiceEnabled,
          }),
        })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          addToConversation('assistant', data.text_response)
          if (data.audio_base64 && voiceEnabled) {
            playAudio(data.audio_base64)
          }
        }
      }
    } catch (err) {
      setError('Failed to get suggestions')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragOut = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleImageUpload(files[0])
    }
  }

  const dietaryOptions = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'low-carb'
  ]

  const cuisineOptions = [
    '', 'Italian', 'Mexican', 'Thai', 'Indian', 'Japanese', 'Chinese', 'Mediterranean', 'American'
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 page-enter">
      {/* Hero Section */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-[var(--copper-100)] mb-6">
          <Sparkles className="w-4 h-4 text-[var(--copper-500)]" />
          <span className="text-sm font-medium text-[var(--copper-700)]">AI-Powered Recipe Discovery</span>
            </div>
        <h2 className="text-5xl md:text-6xl font-bold text-[var(--charcoal)] serif mb-5 leading-tight">
          What's in your <span className="animate-shimmer">kitchen</span>?
        </h2>
        <p className="text-lg text-[var(--copper-600)] max-w-2xl mx-auto leading-relaxed">
          Tell me your ingredients by voice, type them in, or snap a photo of your pantry. 
          I'll help you create something delicious!
              </p>
            </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Input Methods */}
        <div className="space-y-6">
          {/* Voice & Image Input Card */}
          <div className="glass-card rounded-3xl overflow-hidden">
            {/* Voice Section */}
            <div className="p-10 text-center border-b border-[var(--copper-100)]/50">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[var(--copper-50)] to-[var(--sage-50)] rounded-full text-sm font-medium text-[var(--copper-700)] shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-[var(--copper-500)] animate-pulse" />
                  <span>Voice-first cooking assistant</span>
          </div>
        </div>

              {/* Voice Button - Premium Design */}
              <div className="relative inline-flex items-center justify-center mb-8">
                {isListening && (
                  <>
                    <div className="absolute w-36 h-36 rounded-full border-2 border-[var(--copper-300)] animate-pulse-ring" />
                    <div className="absolute w-28 h-28 rounded-full border-2 border-[var(--copper-400)] animate-pulse-ring" style={{ animationDelay: '0.4s' }} />
                  </>
                )}
                    <button
                  onClick={isListening ? stopRecording : startRecording}
                  disabled={isProcessing || isSpeaking}
                  className={`voice-btn ${isListening ? 'recording' : ''} ${isProcessing || isSpeaking ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-10 h-10 loading-spinner text-white" />
                  ) : isListening ? (
                    <MicOff className="w-10 h-10 text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                    </button>
              </div>

              {/* Voice Wave Visualization */}
              {isListening && (
                <div className="flex items-center justify-center gap-1.5 h-10 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 voice-wave"
                    />
                  ))}
                </div>
              )}

              <p className="text-base font-medium text-[var(--copper-700)]">
                {isListening
                  ? '🎙️ Listening... Click to stop'
                  : isProcessing
                  ? '🤔 Processing your request...'
                  : isSpeaking
                  ? '👨‍🍳 Chef is speaking...'
                  : 'Click to speak'}
              </p>

              {/* Voice Toggle */}
              <button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled)
                  if (isSpeaking) stopAudio()
                }}
                className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  voiceEnabled 
                    ? 'bg-[var(--sage-100)] text-[var(--sage-700)] hover:bg-[var(--sage-200)]' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {voiceEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Voice Enabled</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>Voice Disabled</span>
                  </>
                )}
              </button>
            </div>

            {/* Image Upload Section */}
            <div
              className={`p-8 upload-zone rounded-b-3xl ${dragOver ? 'dragover' : ''}`}
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                className="hidden"
              />

              {uploadedImage ? (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden shadow-lg">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-full h-52 object-cover"
                    />
                    {analyzingImage && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/30 flex items-center justify-center backdrop-blur-sm">
                        <div className="text-white text-center">
                          <Loader2 className="w-10 h-10 loading-spinner mx-auto mb-3" />
                          <p className="font-medium">Scanning for ingredients...</p>
                          <p className="text-sm opacity-80 mt-1">Using AI Vision</p>
                        </div>
                      </div>
                    )}
                  </div>
                    <button
                    onClick={() => {
                      setUploadedImage(null)
                      fileInputRef.current.value = ''
                    }}
                    className="btn-ghost text-sm"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    Upload different image
                    </button>
                        </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer text-center py-4 group"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform shadow-lg">
                    <Camera className="w-10 h-10 text-[var(--copper-600)]" />
                      </div>
                  <h4 className="text-xl font-semibold text-[var(--charcoal)] mb-2">
                    Upload a photo
                  </h4>
                  <p className="text-[var(--copper-600)]">
                    Take a picture of your fridge, pantry, or ingredients
                  </p>
                  <p className="text-sm text-[var(--copper-400)] mt-3 flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Drag & drop or click to browse
                  </p>
                  </div>
              )}
              
              {/* Fast/Detailed Scan Toggle */}
              <div className="mt-5 pt-5 border-t border-[var(--copper-100)]/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFastScanMode(!fastScanMode)
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    fastScanMode 
                      ? 'bg-[var(--sage-100)] text-[var(--sage-700)]' 
                      : 'bg-[var(--copper-100)] text-[var(--copper-700)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      fastScanMode ? 'bg-[var(--sage-500)]' : 'bg-[var(--copper-500)]'
                    }`}>
                      {fastScanMode ? (
                        <Flame className="w-4 h-4 text-white" />
                      ) : (
                        <Search className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">
                        {fastScanMode ? '⚡ Fast Scan' : '🔍 Detailed Scan'}
                      </p>
                      <p className="text-xs opacity-75">
                        {fastScanMode ? '~2-3 seconds' : '~8-12 seconds, more thorough'}
                      </p>
                </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${
                    fastScanMode ? 'bg-[var(--sage-300)]' : 'bg-[var(--copper-300)]'
                  }`}>
                    <div className={`absolute w-5 h-5 rounded-full bg-white shadow-md top-0.5 transition-all ${
                      fastScanMode ? 'left-0.5' : 'left-6'
                    }`} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Manual Ingredients Input */}
          <div className="glass-card rounded-3xl p-7">
            <h3 className="text-xl font-semibold text-[var(--charcoal)] mb-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--sage-400)] to-[var(--sage-600)] flex items-center justify-center shadow-md">
                <ShoppingCart className="w-5 h-5 text-white" />
                      </div>
              Your Ingredients
              {ingredients.length > 0 && (
                <span className="ml-auto text-sm font-medium bg-[var(--sage-100)] text-[var(--sage-700)] px-3 py-1 rounded-full">
                  {ingredients.length} items
                </span>
              )}
            </h3>

            {/* Input */}
            <div className="flex gap-3 mb-5">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                placeholder="Type an ingredient..."
                className="input-field flex-1"
                />
                <button
                onClick={addIngredient}
                className="w-12 h-12 bg-gradient-to-br from-[var(--copper-500)] to-[var(--copper-600)] text-white rounded-xl hover:from-[var(--copper-600)] hover:to-[var(--copper-700)] transition-all shadow-lg shadow-[var(--copper-200)] flex items-center justify-center"
                >
                <Plus className="w-6 h-6" />
                </button>
              </div>

            {/* Ingredient Tags */}
              {ingredients.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-5">
                {ingredients.map((ing) => (
                  <span key={ing} className="ingredient-tag">
                    {ing}
                      <button
                      onClick={() => removeIngredient(ing)}
                      className="hover:text-[var(--copper-600)]"
                      >
                      <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
              <div className="text-center py-8 mb-4 border-2 border-dashed border-[var(--copper-100)] rounded-2xl">
                <p className="text-[var(--copper-400)]">
                  No ingredients added yet
                </p>
                <p className="text-sm text-[var(--copper-300)] mt-1">
                  Add ingredients or upload a photo above
                </p>
              </div>
            )}

            {/* Preferences */}
            <div className="grid grid-cols-2 gap-4 pt-5 border-t border-[var(--copper-100)]/50">
              <div>
                <label className="block text-sm font-medium text-[var(--copper-700)] mb-2 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                Cuisine
                </label>
              <select
                value={cuisinePreference}
                onChange={(e) => setCuisinePreference(e.target.value)}
                  className="select-field w-full"
                >
                  <option value="">Any cuisine</option>
                  {cuisineOptions.filter(c => c).map((c) => (
                    <option key={c} value={c}>{c}</option>
                ))}
              </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--copper-700)] mb-2 flex items-center gap-1.5">
                  <Leaf className="w-4 h-4" />
                  Dietary
                </label>
                <select
                  value={dietaryRestrictions[0] || ''}
                  onChange={(e) => setDietaryRestrictions(e.target.value ? [e.target.value] : [])}
                  className="select-field w-full"
                >
                  <option value="">No restrictions</option>
                  {dietaryOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Get Suggestions Button */}
            <button
              onClick={getRecipeSuggestions}
              disabled={ingredients.length === 0 || isProcessing}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 loading-spinner" />
                  <span>Finding recipes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Get Recipe Ideas</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-3 p-5 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 rounded-2xl shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
                </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
                      </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 p-1 hover:bg-red-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
                  </div>
                )}
                </div>

        {/* Right Column - Conversation */}
        <div className="glass-card rounded-3xl overflow-hidden flex flex-col h-[700px]">
          {/* Conversation Header */}
          <div className="p-6 border-b border-[var(--copper-100)]/50 bg-gradient-to-r from-[var(--copper-50)] via-white to-[var(--sage-50)]">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--copper-400)] to-[var(--copper-600)] flex items-center justify-center shadow-lg">
                  <ChefHat className="w-7 h-7 text-white" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isSpeaking ? 'bg-green-500 animate-pulse' : isListening ? 'bg-amber-500 animate-pulse' : 'bg-[var(--sage-500)]'
                }`} />
                      </div>
                      <div>
                <h3 className="text-lg font-semibold text-[var(--charcoal)]">Chef Pantry</h3>
                <p className="text-sm font-medium text-[var(--copper-500)]">
                  {isSpeaking ? '🔊 Speaking...' : isListening ? '🎤 Listening...' : '✨ Ready to help you cook'}
                </p>
                      </div>
                    </div>
                  </div>

          {/* Conversation Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent via-[var(--copper-50)]/30 to-[var(--copper-50)]/50">
            {conversation.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] flex items-center justify-center animate-float shadow-lg">
                    <MessageCircle className="w-12 h-12 text-[var(--copper-500)]" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--sage-400)] to-[var(--sage-600)] flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-[var(--charcoal)] mb-3 serif">
                  Let's start cooking!
                </h4>
                <p className="text-[var(--copper-600)] max-w-sm leading-relaxed">
                  Add your ingredients, upload a photo of your pantry, or tap the microphone and tell me what you have.
                  I'll suggest delicious recipes just for you!
                </p>
                <div className="flex items-center gap-4 mt-8">
                  <div className="flex items-center gap-2 text-sm text-[var(--copper-500)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--copper-100)] flex items-center justify-center">
                      <Mic className="w-3 h-3 text-[var(--copper-500)]" />
              </div>
                    <span>Voice</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--copper-500)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--copper-100)] flex items-center justify-center">
                      <Camera className="w-3 h-3 text-[var(--copper-500)]" />
                  </div>
                    <span>Photo</span>
                </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--copper-500)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--copper-100)] flex items-center justify-center">
                      <Plus className="w-3 h-3 text-[var(--copper-500)]" />
              </div>
                    <span>Type</span>
                </div>
              </div>
              </div>
            ) : (
              conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-[var(--copper-500)] text-white rounded-br-md'
                        : 'bg-[var(--copper-50)] text-[var(--charcoal)] rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
                  </div>
              ))
            )}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-[var(--copper-50)] px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--copper-500)]" />
                    <span className="text-sm text-[var(--copper-600)]">Thinking...</span>
                </div>
              </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="p-4 border-t border-[var(--copper-100)]">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const input = e.target.elements.message
                sendTextMessage(input.value)
                input.value = ''
              }}
              className="flex gap-2"
            >
              <input
                name="message"
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-[var(--copper-50)] border-0 rounded-xl text-[var(--charcoal)] placeholder:text-[var(--copper-400)] focus:outline-none focus:ring-2 focus:ring-[var(--copper-300)]"
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="p-3 bg-[var(--copper-500)] text-white rounded-xl hover:bg-[var(--copper-600)] transition-colors disabled:opacity-50"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
        </div>
              </div>
          </div>
    </div>
  )
}

// ============================================================================
// Cookbook Browser Component
// ============================================================================

function CookbookBrowser({ recipes, loading, selectedRecipe, setSelectedRecipe }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCuisine, setFilterCuisine] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')

  // Get unique cuisines and difficulties from recipes
  const cuisines = [...new Set(recipes.map(r => r.cuisine).filter(Boolean))]
  const difficulties = [...new Set(recipes.map(r => r.difficulty).filter(Boolean))]

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = !searchQuery || 
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCuisine = !filterCuisine || recipe.cuisine === filterCuisine
    const matchesDifficulty = !filterDifficulty || recipe.difficulty === filterDifficulty
    return matchesSearch && matchesCuisine && matchesDifficulty
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 page-enter">
      {selectedRecipe ? (
        <RecipeDetail 
          recipeId={selectedRecipe} 
          onBack={() => setSelectedRecipe(null)} 
        />
      ) : (
        <>
          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-5xl md:text-6xl font-bold text-[var(--charcoal)] serif mb-5 leading-tight">
              Your <span className="animate-shimmer">Cookbook</span>
            </h2>
            <p className="text-lg text-[var(--copper-600)] max-w-2xl mx-auto leading-relaxed">
              Browse our collection of delicious recipes. Find your next culinary adventure!
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 mb-10">
            <div className="flex-1 min-w-[280px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--copper-400)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipes..."
                  className="input-field w-full pl-12"
                />
              </div>
        </div>

            <select
              value={filterCuisine}
              onChange={(e) => setFilterCuisine(e.target.value)}
              className="select-field"
            >
              <option value="">All Cuisines</option>
              {cuisines.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="select-field"
            >
              <option value="">All Difficulties</option>
              {difficulties.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Recipe Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 loading-spinner text-[var(--copper-500)]" />
            </div>
          ) : filteredRecipes.length > 0 ? (
            <div className="cookbook-grid">
              {filteredRecipes.map((recipe, index) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => setSelectedRecipe(recipe.id)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BookOpen className="w-12 h-12 text-[var(--copper-500)]" />
              </div>
              <h3 className="text-2xl font-semibold text-[var(--charcoal)] mb-3 serif">
                No recipes found
              </h3>
              <p className="text-[var(--copper-600)] max-w-sm mx-auto">
                {searchQuery || filterCuisine || filterDifficulty
                  ? 'Try adjusting your search or filters'
                  : 'Your cookbook is empty. Add some recipes to get started!'}
              </p>
          </div>
          )}
        </>
        )}
    </div>
  )
}

// ============================================================================
// Recipe Card Component
// ============================================================================

function RecipeCard({ recipe, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={style}
      className="recipe-card glass-card rounded-3xl overflow-hidden cursor-pointer page-enter"
    >
      {/* Recipe Image */}
      <div className="h-48 bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] flex items-center justify-center overflow-hidden relative">
        {recipe.image_url ? (
          <>
            <img 
              src={recipe.image_url} 
              alt={recipe.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null
                e.target.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
          </>
        ) : (
          <ChefHat className="w-14 h-14 text-[var(--copper-400)]" />
        )}
      </div>

      <div className="p-5">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
              {recipe.cuisine && (
            <span className="px-2 py-0.5 bg-[var(--copper-100)] text-[var(--copper-700)] rounded-full text-xs font-medium">
                  {recipe.cuisine}
                </span>
              )}
          {recipe.difficulty && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              recipe.difficulty === 'Easy' ? 'bg-[var(--sage-100)] text-[var(--sage-700)]' :
              recipe.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {recipe.difficulty}
                </span>
              )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--charcoal)] mb-2 line-clamp-1">
          {recipe.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--copper-600)] mb-4 line-clamp-2">
          {recipe.description || 'A delicious recipe waiting to be discovered.'}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-[var(--copper-500)]">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {recipe.total_time || '30 min'}
                  </span>
          {recipe.dietary_tags?.length > 0 && (
            <span className="flex items-center gap-1">
              <Leaf className="w-4 h-4" />
              {recipe.dietary_tags[0]}
                  </span>
              )}
            </div>
          </div>
        </div>
  )
}

// ============================================================================
// Recipe Detail Component
// ============================================================================

function RecipeDetail({ recipeId, onBack }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchRecipe()
  }, [recipeId])

  const fetchRecipe = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/recipes/${recipeId}`)
      if (!response.ok) throw new Error('Recipe not found')
      const data = await response.json()
      setRecipe(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--copper-500)]" />
    </div>
  )
}

  if (error || !recipe) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-[var(--charcoal)] mb-2">
          {error || 'Recipe not found'}
        </h3>
        <button
          onClick={onBack}
          className="mt-4 px-6 py-2 bg-[var(--copper-500)] text-white rounded-lg hover:bg-[var(--copper-600)]"
        >
          Back to Cookbook
        </button>
      </div>
    )
  }

  const instructions = recipe.instructions?.split('\n').filter(line => line.trim()) || []

  return (
          <div>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[var(--copper-600)] hover:text-[var(--copper-800)] transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Back to Cookbook</span>
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <div className="bg-white rounded-3xl border border-[var(--copper-100)] overflow-hidden">
            <div className="h-64 bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] flex items-center justify-center overflow-hidden">
              {recipe.image_url ? (
                <img 
                  src={recipe.image_url} 
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <ChefHat className="w-20 h-20 text-[var(--copper-400)]" />
              )}
            </div>
            <div className="p-8">
              <div className="flex flex-wrap gap-2 mb-4">
              {recipe.cuisine && (
                  <span className="px-3 py-1 bg-[var(--copper-100)] text-[var(--copper-700)] rounded-full text-sm font-medium">
                  {recipe.cuisine}
                </span>
              )}
                {recipe.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    recipe.difficulty === 'Easy' ? 'bg-[var(--sage-100)] text-[var(--sage-700)]' :
                    recipe.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {recipe.difficulty}
          </span>
                )}
                {recipe.dietary_tags?.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-[var(--sage-100)] text-[var(--sage-700)] rounded-full text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>

              <h1 className="text-3xl font-bold text-[var(--charcoal)] serif mb-4">
                {recipe.name}
              </h1>

              <p className="text-[var(--copper-600)] text-lg mb-6">
          {recipe.description}
        </p>

              <div className="flex flex-wrap gap-6 text-[var(--copper-600)]">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[var(--copper-500)]" />
                  <span>Total: {recipe.total_time}</span>
                </div>
                {recipe.prep_time_minutes && (
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[var(--copper-500)]" />
                    <span>Prep: {recipe.prep_time_minutes} min</span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--copper-500)]" />
                    <span>Serves {recipe.servings}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-3xl border border-[var(--copper-100)] p-8">
            <h2 className="text-2xl font-bold text-[var(--charcoal)] serif mb-6">
              Instructions
            </h2>
            
            {instructions.length > 0 ? (
              <div className="space-y-4">
                {instructions.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--copper-100)] text-[var(--copper-600)] flex items-center justify-center font-medium text-sm">
                      {index + 1}
                    </div>
                    <p className="text-[var(--charcoal)] pt-1">
                      {step.replace(/^\d+\.\s*/, '')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--copper-500)]">
                No instructions available for this recipe.
              </p>
              )}
            </div>
          </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ingredients */}
          <div className="bg-white rounded-3xl border border-[var(--copper-100)] p-6 sticky top-24">
            <h2 className="text-xl font-bold text-[var(--charcoal)] serif mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[var(--copper-500)]" />
              Ingredients
            </h2>
            
            {recipe.ingredients?.length > 0 ? (
              <ul className="space-y-3">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.id} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--copper-300)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--charcoal)]">
                      {ing.name}
                      {ing.category && (
                        <span className="text-[var(--copper-400)] text-sm ml-2">
                          ({ing.category})
                  </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--copper-500)]">
                No ingredients listed.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
