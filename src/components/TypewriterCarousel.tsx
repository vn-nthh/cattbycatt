import { useState, useEffect, useRef } from "react"

interface TypewriterCarouselProps {
  scrambleSpeed?: number
  pauseDuration?: number
  scrambleIterations?: number
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"

function getRandomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

export function TypewriterCarousel({
  scrambleSpeed = 30,
  pauseDuration = 3000,
  scrambleIterations = 8,
}: TypewriterCarouselProps) {
  const [sentences, setSentences] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const iterationCountRef = useRef<number[]>([])

  // Fetch sentences from JSON file
  useEffect(() => {
    fetch("/sentences/sentences.json")
      .then((res) => res.json())
      .then((data: string[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setSentences(data)
          setDisplayText(data[0])
        }
      })
      .catch((err) => {
        console.error("Failed to load sentences:", err)
        const fallback = ["REAL-TIME CAPTIONING AND TRANSLATING TOOL"]
        setSentences(fallback)
        setDisplayText(fallback[0])
      })
  }, [])

  // Start transition to next sentence after pause
  useEffect(() => {
    if (sentences.length <= 1 || isTransitioning) return

    const timer = setTimeout(() => {
      setIsTransitioning(true)
      const nextIndex = (currentIndex + 1) % sentences.length
      const targetText = sentences[nextIndex]
      
      // Initialize iteration counts for each character position
      const maxLength = Math.max(displayText.length, targetText.length)
      iterationCountRef.current = new Array(maxLength).fill(0)
      
      setCurrentIndex(nextIndex)
    }, pauseDuration)

    return () => clearTimeout(timer)
  }, [sentences, currentIndex, isTransitioning, pauseDuration, displayText.length])

  // Scramble animation effect
  useEffect(() => {
    if (!isTransitioning || sentences.length === 0) return

    const targetText = sentences[currentIndex]
    const maxLength = Math.max(displayText.length, targetText.length)

    const timer = setInterval(() => {
      let allDone = true
      let newText = ""

      for (let i = 0; i < maxLength; i++) {
        const targetChar = targetText[i] || ""
        const currentIterations = iterationCountRef.current[i]

        if (currentIterations >= scrambleIterations) {
          // This character is done scrambling, show target
          newText += targetChar
        } else {
          allDone = false
          // Still scrambling - show random char or target char based on progress
          // Characters resolve from left to right with slight delay
          const resolveDelay = Math.floor(i / 3) // stagger resolution
          if (currentIterations >= scrambleIterations - resolveDelay) {
            newText += targetChar
            iterationCountRef.current[i] = scrambleIterations
          } else {
            newText += targetChar === " " ? " " : getRandomChar()
            iterationCountRef.current[i]++
          }
        }
      }

      setDisplayText(newText)

      if (allDone) {
        clearInterval(timer)
        setIsTransitioning(false)
      }
    }, scrambleSpeed)

    return () => clearInterval(timer)
  }, [isTransitioning, sentences, currentIndex, scrambleSpeed, scrambleIterations])

  if (sentences.length === 0) {
    return null
  }

  return (
    <div className="typewriter-container">
      <span className="typewriter-text">
        {displayText}
      </span>
    </div>
  )
}
