import { useState, useEffect, useRef } from "react"

interface Sentence {
  text: string
  priority?: boolean
}

interface TypewriterCarouselProps {
  scrambleSpeed?: number
  pauseDuration?: number
  priorityPauseDuration?: number
  scrambleIterations?: number
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"

function getRandomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

export function TypewriterCarousel({
  scrambleSpeed = 30,
  pauseDuration = 3000,
  priorityPauseDuration = 6000,
  scrambleIterations = 8,
}: TypewriterCarouselProps) {
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isPriority, setIsPriority] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const iterationCountRef = useRef<number[]>([])

  // Fetch sentences from JSON file
  useEffect(() => {
    fetch("/sentences/sentences.json")
      .then((res) => res.json())
      .then((data: (string | Sentence)[]) => {
        if (Array.isArray(data) && data.length > 0) {
          // Normalize to Sentence objects for backwards compatibility
          const normalized: Sentence[] = data.map((item) =>
            typeof item === "string" ? { text: item } : item
          )
          setSentences(normalized)
          setDisplayText(normalized[0].text)
          setIsPriority(normalized[0].priority || false)
        }
      })
      .catch((err) => {
        console.error("Failed to load sentences:", err)
        const fallback: Sentence[] = [{ text: "REAL-TIME CAPTIONING AND TRANSLATING TOOL" }]
        setSentences(fallback)
        setDisplayText(fallback[0].text)
      })
  }, [])

  // Start transition to next sentence after pause
  useEffect(() => {
    if (sentences.length <= 1 || isTransitioning) return

    // Use longer pause for priority sentences
    const currentPause = isPriority ? priorityPauseDuration : pauseDuration

    const timer = setTimeout(() => {
      setIsTransitioning(true)
      const nextIndex = (currentIndex + 1) % sentences.length
      const targetSentence = sentences[nextIndex]
      const currentText = sentences[currentIndex]?.text || ""

      // Initialize iteration counts for each character position
      const maxLength = Math.max(currentText.length, targetSentence.text.length)
      iterationCountRef.current = new Array(maxLength).fill(0)

      setCurrentIndex(nextIndex)
      setIsPriority(targetSentence.priority || false)
    }, currentPause)

    return () => clearTimeout(timer)
  }, [sentences, currentIndex, isTransitioning, pauseDuration, priorityPauseDuration, isPriority])

  // Scramble animation effect
  useEffect(() => {
    if (!isTransitioning || sentences.length === 0) return

    const targetText = sentences[currentIndex].text
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
      <span className={`typewriter-text ${isPriority && !isTransitioning ? 'typewriter-priority' : ''}`}>
        {displayText}
      </span>
    </div>
  )
}
