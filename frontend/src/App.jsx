import { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react'
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
  ArrowLeft,
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
  Heart,
  Timer,
  Sun,
  Moon,
  Trash2,
  ListChecks,
  UtensilsCrossed,
  Zap,
  SkipForward,
  RotateCcw,
  Bell,
  CheckCircle2,
  Circle,
  Printer,
  Share2,
  CalendarDays,
  Video,
  Eye,
} from 'lucide-react'
import LiveCookingCoach from './components/LiveCookingCoach'

// ============================================================================
// Theme Context for Dark Mode
// ============================================================================

const ThemeContext = createContext()

function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('pantry-chef-dark-mode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('pantry-chef-dark-mode', JSON.stringify(darkMode))
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme() {
  return useContext(ThemeContext)
}

// ============================================================================
// Favorites Context
// ============================================================================

const FavoritesContext = createContext()

function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('pantry-chef-favorites')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('pantry-chef-favorites', JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (recipeId) => {
    setFavorites(prev => 
      prev.includes(recipeId) 
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    )
  }

  const isFavorite = (recipeId) => favorites.includes(recipeId)

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

function useFavorites() {
  return useContext(FavoritesContext)
}

// ============================================================================
// Shopping List Context
// ============================================================================

const ShoppingListContext = createContext()

function ShoppingListProvider({ children }) {
  const [shoppingList, setShoppingList] = useState(() => {
    const saved = localStorage.getItem('pantry-chef-shopping-list')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('pantry-chef-shopping-list', JSON.stringify(shoppingList))
  }, [shoppingList])

  const addToShoppingList = (items) => {
    setShoppingList(prev => {
      const newItems = items.filter(item => 
        !prev.some(existing => existing.name.toLowerCase() === item.name.toLowerCase())
      )
      return [...prev, ...newItems.map(item => ({ ...item, checked: false, id: Date.now() + Math.random() }))]
    })
  }

  const removeFromShoppingList = (itemId) => {
    setShoppingList(prev => prev.filter(item => item.id !== itemId))
  }

  const toggleItemChecked = (itemId) => {
    setShoppingList(prev => prev.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ))
  }

  const clearShoppingList = () => setShoppingList([])
  const clearCheckedItems = () => setShoppingList(prev => prev.filter(item => !item.checked))

  return (
    <ShoppingListContext.Provider value={{ 
      shoppingList, 
      addToShoppingList, 
      removeFromShoppingList, 
      toggleItemChecked,
      clearShoppingList,
      clearCheckedItems
    }}>
      {children}
    </ShoppingListContext.Provider>
  )
}

function useShoppingList() {
  return useContext(ShoppingListContext)
}

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  return (
    <ThemeProvider>
      <FavoritesProvider>
        <ShoppingListProvider>
          <AppContent />
        </ShoppingListProvider>
      </FavoritesProvider>
    </ThemeProvider>
  )
}

function AppContent() {
  const { darkMode, setDarkMode } = useTheme()
  const [activeTab, setActiveTab] = useState('assistant') // 'assistant', 'cookbook', 'shopping', 'cooking', 'live-cook'
  const [recipes, setRecipes] = useState([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [cookingRecipe, setCookingRecipe] = useState(null)
  const [liveCookRecipe, setLiveCookRecipe] = useState(null)
  
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

  // Start cooking mode
  const startCookingMode = (recipe) => {
    setCookingRecipe(recipe)
    setActiveTab('cooking')
  }

  // Start live cooking mode (with camera)
  const startLiveCookMode = (recipe) => {
    setLiveCookRecipe(recipe)
    setActiveTab('live-cook')
  }

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {/* Decorative Blobs */}
      <div className="decorative-blob blob-1" />
      <div className="decorative-blob blob-2" />
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab('assistant')}>
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
            <nav className="flex gap-2 bg-white/60 dark:bg-[var(--charcoal-soft)]/60 backdrop-blur-sm p-1.5 rounded-2xl shadow-sm border border-white/80 dark:border-white/10">
              <button
                onClick={() => setActiveTab('assistant')}
                className={`tab-btn ${activeTab === 'assistant' ? 'active' : ''}`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">Assistant</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('cookbook')}
                className={`tab-btn ${activeTab === 'cookbook' ? 'active' : ''}`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Cookbook</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('shopping')}
                className={`tab-btn ${activeTab === 'shopping' ? 'active' : ''}`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Shopping</span>
                </span>
              </button>
              {cookingRecipe && (
                <button
                  onClick={() => setActiveTab('cooking')}
                  className={`tab-btn cooking-pulse ${activeTab === 'cooking' ? 'active' : ''}`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4" />
                    <span className="hidden sm:inline">Cooking</span>
                  </span>
                </button>
              )}
              {liveCookRecipe && (
                <button
                  onClick={() => setActiveTab('live-cook')}
                  className={`tab-btn cooking-pulse ${activeTab === 'live-cook' ? 'active' : ''}`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">Live</span>
                  </span>
                </button>
              )}
            </nav>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 rounded-xl bg-white/60 dark:bg-[var(--charcoal-soft)]/60 backdrop-blur-sm border border-white/80 dark:border-white/10 text-[var(--copper-600)] dark:text-[var(--copper-400)] hover:bg-white dark:hover:bg-[var(--charcoal-soft)] transition-all shadow-sm"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
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
            onStartCooking={startCookingMode}
            onStartLiveCook={startLiveCookMode}
          />
        )}
        {activeTab === 'shopping' && (
          <ShoppingListView />
        )}
        {activeTab === 'cooking' && cookingRecipe && (
          <CookingMode 
            recipeId={cookingRecipe.id || cookingRecipe}
            onExit={() => {
              setCookingRecipe(null)
              setActiveTab('cookbook')
            }}
          />
        )}
        {activeTab === 'live-cook' && liveCookRecipe && (
          <LiveCookingCoach
            recipe={liveCookRecipe}
            onExit={() => {
              setLiveCookRecipe(null)
              setActiveTab('cookbook')
            }}
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
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 dark:bg-[var(--charcoal-soft)]/80 backdrop-blur-sm rounded-full shadow-sm border border-[var(--copper-100)] dark:border-[var(--copper-800)] mb-6">
          <Sparkles className="w-4 h-4 text-[var(--copper-500)]" />
          <span className="text-sm font-medium text-[var(--copper-700)] dark:text-[var(--copper-400)]">AI-Powered Recipe Discovery</span>
            </div>
        <h2 className="text-5xl md:text-6xl font-bold text-[var(--charcoal)] serif mb-5 leading-tight">
          What's in your <span className="animate-shimmer">kitchen</span>?
        </h2>
        <p className="text-lg text-[var(--copper-600)] dark:text-[var(--copper-400)] max-w-2xl mx-auto leading-relaxed">
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
            <div className="p-10 text-center border-b border-[var(--copper-100)]/50 dark:border-[var(--copper-800)]/50">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[var(--copper-50)] to-[var(--sage-50)] dark:from-[var(--copper-900)]/30 dark:to-[var(--sage-900)]/30 rounded-full text-sm font-medium text-[var(--copper-700)] dark:text-[var(--copper-400)] shadow-sm">
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

              <p className="text-base font-medium text-[var(--copper-700)] dark:text-[var(--copper-400)]">
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
                    ? 'bg-[var(--sage-100)] dark:bg-[var(--sage-900)]/30 text-[var(--sage-700)] dark:text-[var(--sage-400)] hover:bg-[var(--sage-200)]' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] dark:from-[var(--copper-800)] dark:to-[var(--copper-900)] flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform shadow-lg">
                    <Camera className="w-10 h-10 text-[var(--copper-600)] dark:text-[var(--copper-400)]" />
                      </div>
                  <h4 className="text-xl font-semibold text-[var(--charcoal)] mb-2">
                    Upload a photo
                  </h4>
                  <p className="text-[var(--copper-600)] dark:text-[var(--copper-400)]">
                    Take a picture of your fridge, pantry, or ingredients
                  </p>
                  <p className="text-sm text-[var(--copper-400)] mt-3 flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Drag & drop or click to browse
                  </p>
                  </div>
              )}
              
              {/* Fast/Detailed Scan Toggle */}
              <div className="mt-5 pt-5 border-t border-[var(--copper-100)]/50 dark:border-[var(--copper-800)]/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFastScanMode(!fastScanMode)
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    fastScanMode 
                      ? 'bg-[var(--sage-100)] dark:bg-[var(--sage-900)]/30 text-[var(--sage-700)] dark:text-[var(--sage-400)]' 
                      : 'bg-[var(--copper-100)] dark:bg-[var(--copper-900)]/30 text-[var(--copper-700)] dark:text-[var(--copper-400)]'
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
                <span className="ml-auto text-sm font-medium bg-[var(--sage-100)] dark:bg-[var(--sage-900)]/30 text-[var(--sage-700)] dark:text-[var(--sage-400)] px-3 py-1 rounded-full">
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
                className="w-12 h-12 bg-gradient-to-br from-[var(--copper-500)] to-[var(--copper-600)] text-white rounded-xl hover:from-[var(--copper-600)] hover:to-[var(--copper-700)] transition-all shadow-lg shadow-[var(--copper-200)] dark:shadow-[var(--copper-900)] flex items-center justify-center"
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
              <div className="text-center py-8 mb-4 border-2 border-dashed border-[var(--copper-100)] dark:border-[var(--copper-800)] rounded-2xl">
                <p className="text-[var(--copper-400)]">
                  No ingredients added yet
                </p>
                <p className="text-sm text-[var(--copper-300)] mt-1">
                  Add ingredients or upload a photo above
                </p>
              </div>
            )}

            {/* Preferences */}
            <div className="grid grid-cols-2 gap-4 pt-5 border-t border-[var(--copper-100)]/50 dark:border-[var(--copper-800)]/50">
              <div>
                <label className="block text-sm font-medium text-[var(--copper-700)] dark:text-[var(--copper-400)] mb-2 flex items-center gap-1.5">
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
                <label className="block text-sm font-medium text-[var(--copper-700)] dark:text-[var(--copper-400)] mb-2 flex items-center gap-1.5">
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
            <div className="flex items-start gap-3 p-5 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border border-red-200 dark:border-red-800 rounded-2xl shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
                </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                      </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
                  </div>
                )}
                </div>

        {/* Right Column - Conversation */}
        <div className="glass-card rounded-3xl overflow-hidden flex flex-col h-[700px]">
          {/* Conversation Header */}
          <div className="p-6 border-b border-[var(--copper-100)]/50 dark:border-[var(--copper-800)]/50 bg-gradient-to-r from-[var(--copper-50)] via-white to-[var(--sage-50)] dark:from-[var(--copper-900)]/20 dark:via-[var(--charcoal-soft)] dark:to-[var(--sage-900)]/20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--copper-400)] to-[var(--copper-600)] flex items-center justify-center shadow-lg">
                  <ChefHat className="w-7 h-7 text-white" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[var(--charcoal)] ${
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
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent via-[var(--copper-50)]/30 to-[var(--copper-50)]/50 dark:from-transparent dark:via-[var(--charcoal-soft)]/30 dark:to-[var(--charcoal-soft)]/50">
            {conversation.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] dark:from-[var(--copper-800)] dark:to-[var(--copper-900)] flex items-center justify-center animate-float shadow-lg">
                    <MessageCircle className="w-12 h-12 text-[var(--copper-500)]" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--sage-400)] to-[var(--sage-600)] flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-[var(--charcoal)] mb-3 serif">
                  Let's start cooking!
                </h4>
                <p className="text-[var(--copper-600)] dark:text-[var(--copper-400)] max-w-sm leading-relaxed">
                  Add your ingredients, upload a photo of your pantry, or tap the microphone and tell me what you have.
                  I'll suggest delicious recipes just for you!
                </p>
                <div className="flex items-center gap-4 mt-8">
                  <div className="flex items-center gap-2 text-sm text-[var(--copper-500)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--copper-100)] dark:bg-[var(--copper-900)] flex items-center justify-center">
                      <Mic className="w-3 h-3 text-[var(--copper-500)]" />
              </div>
                    <span>Voice</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--copper-500)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--copper-100)] dark:bg-[var(--copper-900)] flex items-center justify-center">
                      <Camera className="w-3 h-3 text-[var(--copper-500)]" />
                  </div>
                    <span>Photo</span>
                </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--copper-500)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--copper-100)] dark:bg-[var(--copper-900)] flex items-center justify-center">
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
                        : 'bg-[var(--copper-50)] dark:bg-[var(--charcoal-soft)] text-[var(--charcoal)] rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
                  </div>
              ))
            )}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-[var(--copper-50)] dark:bg-[var(--charcoal-soft)] px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--copper-500)]" />
                    <span className="text-sm text-[var(--copper-600)] dark:text-[var(--copper-400)]">Thinking...</span>
                </div>
              </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="p-4 border-t border-[var(--copper-100)] dark:border-[var(--copper-800)]">
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
                className="flex-1 px-4 py-3 bg-[var(--copper-50)] dark:bg-[var(--charcoal-soft)] border-0 rounded-xl text-[var(--charcoal)] placeholder:text-[var(--copper-400)] focus:outline-none focus:ring-2 focus:ring-[var(--copper-300)]"
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

function CookbookBrowser({ recipes, loading, selectedRecipe, setSelectedRecipe, onStartCooking, onStartLiveCook }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCuisine, setFilterCuisine] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const { favorites, isFavorite } = useFavorites()

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
    const matchesFavorites = !showFavoritesOnly || isFavorite(recipe.id)
    return matchesSearch && matchesCuisine && matchesDifficulty && matchesFavorites
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 page-enter">
      {selectedRecipe ? (
        <RecipeDetail 
          recipeId={selectedRecipe} 
          onBack={() => setSelectedRecipe(null)}
          onStartCooking={onStartCooking}
          onStartLiveCook={onStartLiveCook}
        />
      ) : (
        <>
          {/* Header */}
          <div className="text-center mb-14">
            <h2 className="text-5xl md:text-6xl font-bold text-[var(--charcoal)] serif mb-5 leading-tight">
              Your <span className="animate-shimmer">Cookbook</span>
            </h2>
            <p className="text-lg text-[var(--copper-600)] dark:text-[var(--copper-400)] max-w-2xl mx-auto leading-relaxed">
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

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                showFavoritesOnly
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'bg-white dark:bg-[var(--charcoal-soft)] border border-[var(--copper-100)] dark:border-[var(--copper-800)] text-[var(--copper-600)] dark:text-[var(--copper-400)]'
              }`}
            >
              <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Favorites</span>
              {favorites.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  showFavoritesOnly ? 'bg-red-200 dark:bg-red-800' : 'bg-[var(--copper-100)] dark:bg-[var(--copper-800)]'
                }`}>
                  {favorites.length}
                </span>
              )}
            </button>
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
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] dark:from-[var(--copper-800)] dark:to-[var(--copper-900)] flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BookOpen className="w-12 h-12 text-[var(--copper-500)]" />
              </div>
              <h3 className="text-2xl font-semibold text-[var(--charcoal)] mb-3 serif">
                No recipes found
              </h3>
              <p className="text-[var(--copper-600)] dark:text-[var(--copper-400)] max-w-sm mx-auto">
                {searchQuery || filterCuisine || filterDifficulty || showFavoritesOnly
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
  const { toggleFavorite, isFavorite } = useFavorites()
  const favorite = isFavorite(recipe.id)

  return (
    <div
      style={style}
      onClick={onClick}
      className="recipe-card glass-card rounded-3xl overflow-hidden cursor-pointer page-enter relative group"
    >
      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleFavorite(recipe.id)
        }}
        className={`absolute top-4 right-4 z-10 p-2.5 rounded-xl backdrop-blur-sm transition-all ${
          favorite 
            ? 'bg-red-500 text-white shadow-lg' 
            : 'bg-white/80 dark:bg-black/40 text-[var(--copper-400)] hover:bg-white dark:hover:bg-black/60 hover:text-red-500'
        }`}
      >
        <Heart className={`w-5 h-5 ${favorite ? 'fill-current' : ''}`} />
      </button>

      <div>
        {/* Recipe Image */}
        <div className="h-48 bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] dark:from-[var(--copper-800)] dark:to-[var(--copper-900)] flex items-center justify-center overflow-hidden relative">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          ) : (
            <ChefHat className="w-14 h-14 text-[var(--copper-400)]" />
          )}
        </div>

        <div className="p-5">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
              {recipe.cuisine && (
            <span className="px-2 py-0.5 bg-[var(--copper-100)] dark:bg-[var(--copper-900)]/50 text-[var(--copper-700)] dark:text-[var(--copper-400)] rounded-full text-xs font-medium">
                  {recipe.cuisine}
                </span>
              )}
            {recipe.difficulty && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                recipe.difficulty === 'Easy' ? 'bg-[var(--sage-100)] dark:bg-[var(--sage-900)]/50 text-[var(--sage-700)] dark:text-[var(--sage-400)]' :
                recipe.difficulty === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400' :
                'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
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
          <p className="text-sm text-[var(--copper-600)] dark:text-[var(--copper-400)] mb-4 line-clamp-2">
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
      </div>
  )
}

// ============================================================================
// Recipe Detail Component
// ============================================================================

function RecipeDetail({ recipeId, onBack, onStartCooking, onStartLiveCook }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { toggleFavorite, isFavorite } = useFavorites()
  const { addToShoppingList } = useShoppingList()

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

  const handleAddToShoppingList = () => {
    if (recipe?.ingredients) {
      const items = recipe.ingredients.map(ing => ({
        name: ing.name,
        category: ing.category,
        recipeId: recipe.id,
        recipeName: recipe.name
      }))
      addToShoppingList(items)
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
  const favorite = isFavorite(recipeId)

  return (
          <div>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[var(--copper-600)] dark:text-[var(--copper-400)] hover:text-[var(--copper-800)] dark:hover:text-[var(--copper-300)] transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Back to Cookbook</span>
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="h-64 bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] dark:from-[var(--copper-800)] dark:to-[var(--copper-900)] flex items-center justify-center overflow-hidden relative">
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
              
              {/* Action Buttons Overlay */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => toggleFavorite(recipeId)}
                  className={`p-3 rounded-xl backdrop-blur-sm transition-all ${
                    favorite 
                      ? 'bg-red-500 text-white shadow-lg' 
                      : 'bg-white/80 dark:bg-black/40 text-[var(--copper-600)] hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${favorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="flex flex-wrap gap-2 mb-4">
              {recipe.cuisine && (
                  <span className="px-3 py-1 bg-[var(--copper-100)] dark:bg-[var(--copper-900)]/50 text-[var(--copper-700)] dark:text-[var(--copper-400)] rounded-full text-sm font-medium">
                  {recipe.cuisine}
                </span>
              )}
                {recipe.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    recipe.difficulty === 'Easy' ? 'bg-[var(--sage-100)] dark:bg-[var(--sage-900)]/50 text-[var(--sage-700)] dark:text-[var(--sage-400)]' :
                    recipe.difficulty === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400' :
                    'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                  }`}>
                    {recipe.difficulty}
          </span>
                )}
                {recipe.dietary_tags?.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-[var(--sage-100)] dark:bg-[var(--sage-900)]/50 text-[var(--sage-700)] dark:text-[var(--sage-400)] rounded-full text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>

              <h1 className="text-3xl font-bold text-[var(--charcoal)] serif mb-4">
                {recipe.name}
              </h1>

              <p className="text-[var(--copper-600)] dark:text-[var(--copper-400)] text-lg mb-6">
          {recipe.description}
        </p>

              <div className="flex flex-wrap gap-6 text-[var(--copper-600)] dark:text-[var(--copper-400)] mb-6">
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

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onStartLiveCook(recipe)}
                  className="btn-primary flex items-center gap-2 bg-gradient-to-r from-[var(--sage-500)] to-[var(--sage-600)] shadow-lg shadow-[var(--sage-200)] dark:shadow-[var(--sage-900)]"
                >
                  <Video className="w-5 h-5" />
                  Live Cook with AI
                </button>
                <button
                  onClick={() => onStartCooking(recipe)}
                  className="btn-ghost flex items-center gap-2 border border-[var(--copper-200)] dark:border-[var(--copper-700)]"
                >
                  <UtensilsCrossed className="w-5 h-5" />
                  Step-by-Step
                </button>
                <button
                  onClick={handleAddToShoppingList}
                  className="btn-ghost flex items-center gap-2 border border-[var(--copper-200)] dark:border-[var(--copper-700)]"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Shopping List
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="glass-card rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-[var(--charcoal)] serif mb-6">
              Instructions
            </h2>
            
            {instructions.length > 0 ? (
              <div className="space-y-4">
                {instructions.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--copper-100)] dark:bg-[var(--copper-900)]/50 text-[var(--copper-600)] dark:text-[var(--copper-400)] flex items-center justify-center font-medium text-sm">
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
          <div className="glass-card rounded-3xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-[var(--charcoal)] serif mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[var(--copper-500)]" />
              Ingredients
            </h2>
            
            {recipe.ingredients?.length > 0 ? (
              <ul className="space-y-3">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.id} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--copper-300)] dark:border-[var(--copper-700)] flex-shrink-0 mt-0.5" />
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

            <button
              onClick={handleAddToShoppingList}
              className="w-full mt-6 py-3 bg-[var(--sage-100)] dark:bg-[var(--sage-900)]/30 text-[var(--sage-700)] dark:text-[var(--sage-400)] rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[var(--sage-200)] dark:hover:bg-[var(--sage-900)]/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add All to Shopping List
            </button>
          </div>

          {/* Nutrition Estimate */}
          <div className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-bold text-[var(--charcoal)] serif mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[var(--copper-500)]" />
              Nutrition (Est.)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <NutritionItem label="Calories" value="~350" unit="kcal" />
              <NutritionItem label="Protein" value="~25" unit="g" />
              <NutritionItem label="Carbs" value="~35" unit="g" />
              <NutritionItem label="Fat" value="~12" unit="g" />
            </div>
            <p className="text-xs text-[var(--copper-400)] mt-4">
              * Estimates based on typical ingredients. Actual values may vary.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function NutritionItem({ label, value, unit }) {
  return (
    <div className="bg-[var(--copper-50)] dark:bg-[var(--charcoal-soft)] rounded-xl p-3 text-center">
      <p className="text-xs text-[var(--copper-500)] mb-1">{label}</p>
      <p className="text-lg font-semibold text-[var(--charcoal)]">
        {value}
        <span className="text-sm font-normal text-[var(--copper-400)] ml-1">{unit}</span>
      </p>
    </div>
  )
}

// ============================================================================
// Shopping List View Component
// ============================================================================

function ShoppingListView() {
  const { 
    shoppingList, 
    removeFromShoppingList, 
    toggleItemChecked,
    clearShoppingList,
    clearCheckedItems
  } = useShoppingList()

  const checkedCount = shoppingList.filter(item => item.checked).length
  const uncheckedCount = shoppingList.length - checkedCount

  // Group items by category
  const groupedItems = shoppingList.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 page-enter">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--sage-400)] to-[var(--sage-600)] mb-6 shadow-xl">
          <ListChecks className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-[var(--charcoal)] serif mb-4">
          Shopping List
        </h2>
        <p className="text-[var(--copper-600)] dark:text-[var(--copper-400)]">
          {shoppingList.length === 0 
            ? 'Your shopping list is empty'
            : `${uncheckedCount} items to buy${checkedCount > 0 ? `, ${checkedCount} checked off` : ''}`
          }
        </p>
      </div>

      {shoppingList.length > 0 ? (
        <>
          {/* Actions */}
          <div className="flex justify-end gap-3 mb-6">
            {checkedCount > 0 && (
              <button
                onClick={clearCheckedItems}
                className="btn-ghost text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Checked ({checkedCount})
              </button>
            )}
            <button
              onClick={clearShoppingList}
              className="btn-ghost text-sm text-red-500 hover:text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>

          {/* Grouped Items */}
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-[var(--copper-50)] dark:bg-[var(--charcoal-soft)] border-b border-[var(--copper-100)] dark:border-[var(--copper-800)]">
                  <h3 className="font-semibold text-[var(--charcoal)] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--copper-500)]" />
                    {category}
                    <span className="text-sm font-normal text-[var(--copper-400)] ml-auto">
                      {items.length} items
                    </span>
                  </h3>
                </div>
                <ul className="divide-y divide-[var(--copper-100)] dark:divide-[var(--copper-800)]">
                  {items.map((item) => (
                    <li 
                      key={item.id}
                      className={`flex items-center gap-4 px-5 py-4 transition-all ${
                        item.checked ? 'bg-[var(--sage-50)] dark:bg-[var(--sage-900)]/10' : ''
                      }`}
                    >
                      <button
                        onClick={() => toggleItemChecked(item.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          item.checked
                            ? 'bg-[var(--sage-500)] border-[var(--sage-500)] text-white'
                            : 'border-[var(--copper-300)] dark:border-[var(--copper-700)] hover:border-[var(--copper-500)]'
                        }`}
                      >
                        {item.checked && <Check className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium ${item.checked ? 'line-through text-[var(--copper-400)]' : 'text-[var(--charcoal)]'}`}>
                          {item.name}
                        </p>
                        {item.recipeName && (
                          <p className="text-xs text-[var(--copper-400)]">
                            From: {item.recipeName}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromShoppingList(item.id)}
                        className="p-2 text-[var(--copper-400)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 glass-card rounded-3xl">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--copper-100)] to-[var(--copper-200)] dark:from-[var(--copper-800)] dark:to-[var(--copper-900)] flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-[var(--copper-400)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--charcoal)] mb-2 serif">
            No items yet
          </h3>
          <p className="text-[var(--copper-500)] max-w-sm mx-auto">
            Browse recipes and add ingredients to your shopping list for easy grocery shopping!
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Cooking Mode Component
// ============================================================================

function CookingMode({ recipeId, onExit }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const audioRef = useRef(null)
  
  // Timer state
  const [activeTimers, setActiveTimers] = useState([])

  useEffect(() => {
    fetchRecipe()
  }, [recipeId])

  const fetchRecipe = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/recipes/${recipeId}`)
      if (response.ok) {
        const data = await response.json()
        setRecipe(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const instructions = recipe?.instructions?.split('\n').filter(line => line.trim()) || []
  const currentInstruction = instructions[currentStep]?.replace(/^\d+\.\s*/, '') || ''

  // Speak the current step
  const speakStep = async () => {
    if (!voiceEnabled || !currentInstruction) return

    try {
      const response = await fetch('/api/voice/cooking-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_name: recipe.name,
          current_step: currentStep + 1,
          total_steps: instructions.length,
          step_instruction: currentInstruction,
          generate_audio: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.audio_base64) {
          playAudio(data.audio_base64)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const playAudio = (base64Audio) => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    audioRef.current.src = `data:audio/mp3;base64,${base64Audio}`
    audioRef.current.onplay = () => setIsSpeaking(true)
    audioRef.current.onended = () => setIsSpeaking(false)
    audioRef.current.play()
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsSpeaking(false)
    }
  }

  const nextStep = () => {
    if (currentStep < instructions.length - 1) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep])
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const toggleStepComplete = (stepIndex) => {
    if (completedSteps.includes(stepIndex)) {
      setCompletedSteps(completedSteps.filter(s => s !== stepIndex))
    } else {
      setCompletedSteps([...completedSteps, stepIndex])
    }
  }

  // Add a timer
  const addTimer = (minutes) => {
    const newTimer = {
      id: Date.now(),
      duration: minutes * 60,
      remaining: minutes * 60,
      isRunning: true,
      label: `${minutes} min timer`
    }
    setActiveTimers([...activeTimers, newTimer])
  }

  // Timer tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prev => prev.map(timer => {
        if (timer.isRunning && timer.remaining > 0) {
          const newRemaining = timer.remaining - 1
          if (newRemaining === 0) {
            // Play alert sound
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoAUr7w4KdRAAVGqOLrkl8AACyjwtSNSwAALqLs34tGAA...')
            audio.play().catch(() => {})
          }
          return { ...timer, remaining: newRemaining }
        }
        return timer
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 loading-spinner text-[var(--copper-500)]" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-[var(--charcoal)]">Recipe not found</p>
        <button onClick={onExit} className="mt-4 btn-primary">
          Exit Cooking Mode
        </button>
      </div>
    )
  }

  const progress = ((currentStep + 1) / instructions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--copper-50)] to-white dark:from-[var(--charcoal)] dark:to-[var(--charcoal-soft)]">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 glass border-b border-[var(--glass-border)]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onExit}
              className="flex items-center gap-2 text-[var(--copper-600)] hover:text-[var(--copper-800)]"
            >
              <X className="w-5 h-5" />
              <span>Exit</span>
            </button>
            
            <div className="text-center">
              <h1 className="font-semibold text-[var(--charcoal)] line-clamp-1">{recipe.name}</h1>
              <p className="text-sm text-[var(--copper-500)]">
                Step {currentStep + 1} of {instructions.length}
              </p>
            </div>

            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-lg ${voiceEnabled ? 'text-[var(--sage-600)]' : 'text-[var(--copper-400)]'}`}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-[var(--copper-100)] dark:bg-[var(--copper-900)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--copper-500)] to-[var(--sage-500)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Current Step - Large Display */}
          <div className="md:col-span-2">
            <div className="glass-card rounded-3xl p-8 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--copper-500)] to-[var(--copper-600)] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {currentStep + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--copper-500)] font-medium">Current Step</p>
                  <p className="text-xs text-[var(--copper-400)]">
                    {completedSteps.length} of {instructions.length} steps completed
                  </p>
                </div>
                <button
                  onClick={speakStep}
                  disabled={isSpeaking}
                  className={`p-3 rounded-xl ${
                    isSpeaking 
                      ? 'bg-[var(--sage-500)] text-white animate-pulse' 
                      : 'bg-[var(--copper-100)] dark:bg-[var(--copper-900)] text-[var(--copper-600)] hover:bg-[var(--copper-200)]'
                  }`}
                >
                  {isSpeaking ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-2xl text-[var(--charcoal)] leading-relaxed serif">
                {currentInstruction}
              </p>

              {/* Quick Timer Buttons */}
              <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[var(--copper-100)] dark:border-[var(--copper-800)]">
                <span className="text-sm text-[var(--copper-500)] mr-2 flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  Quick timer:
                </span>
                {[1, 3, 5, 10, 15].map(mins => (
                  <button
                    key={mins}
                    onClick={() => addTimer(mins)}
                    className="px-3 py-1.5 bg-[var(--copper-100)] dark:bg-[var(--copper-900)] text-[var(--copper-600)] dark:text-[var(--copper-400)] rounded-lg text-sm font-medium hover:bg-[var(--copper-200)] dark:hover:bg-[var(--copper-800)] transition-colors"
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex-1 py-4 rounded-2xl font-medium flex items-center justify-center gap-2 bg-white dark:bg-[var(--charcoal-soft)] border border-[var(--copper-200)] dark:border-[var(--copper-800)] text-[var(--copper-600)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--copper-50)] dark:hover:bg-[var(--charcoal)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Previous
              </button>
              {currentStep < instructions.length - 1 ? (
                <button
                  onClick={nextStep}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  Next Step
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCompletedSteps([...completedSteps, currentStep])
                    // Show completion animation or message
                    alert('🎉 Congratulations! You completed the recipe!')
                    onExit()
                  }}
                  className="flex-1 py-4 rounded-2xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--sage-500)] to-[var(--sage-600)] text-white shadow-lg"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Finish Recipe!
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Timers */}
            {activeTimers.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-semibold text-[var(--charcoal)] mb-4 flex items-center gap-2">
                  <Timer className="w-5 h-5 text-[var(--copper-500)]" />
                  Active Timers
                </h3>
                <div className="space-y-3">
                  {activeTimers.map(timer => (
                    <div 
                      key={timer.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        timer.remaining === 0 
                          ? 'bg-red-100 dark:bg-red-900/30 animate-pulse' 
                          : 'bg-[var(--copper-50)] dark:bg-[var(--charcoal-soft)]'
                      }`}
                    >
                      <div className={`text-2xl font-mono font-bold ${
                        timer.remaining === 0 ? 'text-red-600' : 'text-[var(--charcoal)]'
                      }`}>
                        {formatTime(timer.remaining)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--copper-500)]">{timer.label}</p>
                      </div>
                      <button
                        onClick={() => setActiveTimers(activeTimers.filter(t => t.id !== timer.id))}
                        className="p-1 text-[var(--copper-400)] hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step Overview */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-[var(--charcoal)] mb-4">All Steps</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {instructions.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                      index === currentStep 
                        ? 'bg-[var(--copper-100)] dark:bg-[var(--copper-900)]' 
                        : 'hover:bg-[var(--copper-50)] dark:hover:bg-[var(--charcoal-soft)]'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                      completedSteps.includes(index)
                        ? 'bg-[var(--sage-500)] text-white'
                        : index === currentStep
                        ? 'bg-[var(--copper-500)] text-white'
                        : 'bg-[var(--copper-100)] dark:bg-[var(--copper-900)] text-[var(--copper-600)]'
                    }`}>
                      {completedSteps.includes(index) ? <Check className="w-4 h-4" /> : index + 1}
                    </div>
                    <p className={`text-sm line-clamp-2 ${
                      completedSteps.includes(index) 
                        ? 'text-[var(--copper-400)] line-through' 
                        : 'text-[var(--charcoal)]'
                    }`}>
                      {step.replace(/^\d+\.\s*/, '')}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients Quick Reference */}
            {recipe.ingredients?.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-semibold text-[var(--charcoal)] mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[var(--copper-500)]" />
                  Ingredients
                </h3>
                <ul className="space-y-2 text-sm">
                  {recipe.ingredients.slice(0, 6).map((ing, i) => (
                    <li key={i} className="text-[var(--copper-600)] dark:text-[var(--copper-400)]">
                      • {ing.name}
                    </li>
                  ))}
                  {recipe.ingredients.length > 6 && (
                    <li className="text-[var(--copper-400)] text-xs">
                      +{recipe.ingredients.length - 6} more...
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
