import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

declare global {
  interface Window {
    electron?: {
      isElectron?: boolean
      getApiKey?: () => Promise<string | null>
      setApiKey?: (key: string) => Promise<boolean>
      deleteApiKey?: () => Promise<boolean>
    }
  }
}

export function ApiKeyScreen() {
  const [groqKey, setGroqKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const key = await window.electron?.getApiKey?.()
        if (!mounted) return
        if (key) {
          setGroqKey(key)
          // Key exists, go to home
          navigate('/', { replace: true })
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [navigate])

  async function saveKey() {
    const trimmed = groqKey.trim()
    if (!trimmed) return
    setIsSaving(true)
    try {
      console.log('Saving API key...')
      console.log('window.electron available:', !!window.electron)
      console.log('setApiKey function available:', !!window.electron?.setApiKey)
      
      if (!window.electron?.setApiKey) {
        console.error('Electron API not available')
        return
      }
      
      const ok = await window.electron.setApiKey(trimmed)
      console.log('Save result:', ok)
      if (ok === true) {
        // Notify app that API key has changed
        console.log('Dispatching groq-api-key-updated event')
        window.dispatchEvent(new CustomEvent('groq-api-key-updated'))
        console.log('Event dispatched, should trigger parent update')
      } else {
        console.error('Failed to save API key, result:', ok)
      }
    } catch (e) {
      console.error('Error saving API key:', e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-950 text-white p-6">
      <div className="w-full max-w-lg bg-gray-900/70 p-6 rounded-xl border border-gray-800">
        <h1 className="text-2xl font-semibold mb-4">Groq API Key</h1>
        <p className="text-sm text-gray-400 mb-4">Enter your Groq API key to enable Advanced ASR and translation.</p>
        <input
          className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white font-medium border border-gray-700 mb-4"
          type="password"
          placeholder="sk_groq_..."
          value={groqKey}
          onChange={(e) => setGroqKey(e.target.value)}
        />
        <button
          onClick={saveKey}
          disabled={isSaving || !groqKey.trim()}
          className="w-full px-4 py-3 rounded-lg bg-blue-600 disabled:opacity-50 hover:bg-blue-500 transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default ApiKeyScreen


