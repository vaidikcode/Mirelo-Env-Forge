import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './PlayExperiencePage.module.css'

function PlayExperiencePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { videoUrl, events } = location.state || {}

  const [selectedVariations, setSelectedVariations] = useState({})
  const [isPlaying, setIsPlaying] = useState(false)
  
  const videoRef = useRef(null)
  const audioRefs = useRef({})
  const loopIntervals = useRef({})

  useEffect(() => {
    if (!videoUrl || !events) {
      navigate('/workspace')
    }
  }, [videoUrl, events, navigate])

  const handleVariationSelect = (eventName, variation) => {
    setSelectedVariations(prev => ({
      ...prev,
      [eventName]: variation
    }))
  }

  const playLoopAudio = (audioUrl, eventName) => {
    const audio = new Audio(audioUrl)
    audioRefs.current[eventName] = audio
    
    audio.play()
    
    // Loop every 10 seconds for LOOP type
    loopIntervals.current[eventName] = setInterval(() => {
      if (isPlaying) {
        audio.currentTime = 0
        audio.play()
      }
    }, 10000)
  }

  const handlePlayExperience = () => {
    if (!videoRef.current) return

    // Check if all events have selected variations
    const allSelected = events.every(event => selectedVariations[event.name])
    if (!allSelected) {
      alert('Please select one variation for each event')
      return
    }

    videoRef.current.currentTime = 0
    videoRef.current.play()
    setIsPlaying(true)

    events.forEach(event => {
      const audioUrl = selectedVariations[event.name]
      if (!audioUrl) return

      const startTime = (event.metadata.start || 0) * 1000

      if (event.type === 'LOOP') {
        // Start loop audio and repeat every 10 seconds
        setTimeout(() => {
          if (isPlaying) {
            playLoopAudio(audioUrl, event.name)
          }
        }, startTime)
      } else {
        // EMITTER - play once at timestamp
        setTimeout(() => {
          if (isPlaying) {
            const audio = new Audio(audioUrl)
            audioRefs.current[event.name] = audio
            audio.play()
          }
        }, startTime)
      }
    })
  }

  const handleStopExperience = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    
    setIsPlaying(false)

    // Stop all audio
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })

    // Clear all loop intervals
    Object.values(loopIntervals.current).forEach(interval => {
      clearInterval(interval)
    })

    audioRefs.current = {}
    loopIntervals.current = {}
  }

  useEffect(() => {
    return () => {
      handleStopExperience()
    }
  }, [])

  if (!videoUrl || !events) {
    return null
  }

  const allEventsSelected = events.every(event => selectedVariations[event.name])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/workspace')} className={styles.backButton}>
          ← Back to Workspace
        </button>
        <h2 className={styles.title}>Play Experience</h2>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.videoSection}>
          <video
            ref={videoRef}
            src={videoUrl}
            className={styles.videoPlayer}
            onEnded={handleStopExperience}
          />
          
          <div className={styles.controls}>
            <button
              onClick={handlePlayExperience}
              disabled={!allEventsSelected || isPlaying}
              className={styles.playButton}
            >
              ▶ Play Experience
            </button>
            
            <button
              onClick={handleStopExperience}
              disabled={!isPlaying}
              className={styles.stopButton}
            >
              ⏹ Stop
            </button>
          </div>

          {!allEventsSelected && (
            <p className={styles.hint}>Select one variation for each event to play</p>
          )}
        </div>

        <div className={styles.eventsSection}>
          <h3 className={styles.sectionTitle}>Select Audio Variations</h3>
          <p className={styles.subtitle}>Choose one variation per event</p>
          
          <div className={styles.eventsList}>
            {events.map((event, idx) => (
              <div key={idx} className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <div className={styles.eventInfo}>
                    <span className={styles.eventName}>{event.name}</span>
                    <span className={styles.eventType}>{event.type}</span>
                    {event.type === 'LOOP' && (
                      <span className={styles.loopBadge}>🔁 Loops every 10s</span>
                    )}
                  </div>
                  <div className={styles.eventMeta}>
                    {event.metadata.start?.toFixed(1)}s | {event.metadata.duration?.toFixed(1)}s
                  </div>
                </div>

                <div className={styles.variationsGrid}>
                  {event.variations.map((variation, vIdx) => {
                    const isSelected = selectedVariations[event.name] === variation
                    
                    return (
                      <button
                        key={vIdx}
                        onClick={() => handleVariationSelect(event.name, variation)}
                        className={`${styles.variationButton} ${isSelected ? styles.selected : ''}`}
                      >
                        <span className={styles.variationLabel}>Variation {vIdx + 1}</span>
                        {isSelected && <span className={styles.checkmark}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayExperiencePage
