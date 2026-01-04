import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadVideo } from '../lib/supabase'
import { processVideo } from '../lib/api'
import styles from './WorkspacePage.module.css'

function WorkspacePage() {
  const navigate = useNavigate()
  const [videoFile, setVideoFile] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedVariations, setSelectedVariations] = useState({})
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [playingAudio, setPlayingAudio] = useState(null)
  const [playingVariation, setPlayingVariation] = useState(null)
  
  const videoRef = useRef(null)
  const audioRefs = useRef({})
  const previewAudioRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
    }
  }

  const handleProcess = async () => {
    if (!videoFile || !prompt.trim()) {
      alert('Please provide both a video and a prompt')
      return
    }

    setLoading(true)
    try {
      const uploadedUrl = await uploadVideo(videoFile)
      setVideoUrl(uploadedUrl)

      const result = await processVideo(uploadedUrl, prompt)
      
      if (result.status === 'success' && result.data) {
        setEvents(result.data)
        const initialSelections = {}
        result.data.forEach(event => {
          initialSelections[event.name] = event.variations[0]
        })
        setSelectedVariations(initialSelections)
      }
    } catch (error) {
      alert('Error processing video: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVariationSelect = (eventName, variation) => {
    setSelectedVariations(prev => ({
      ...prev,
      [eventName]: variation
    }))
  }

  const handleEventSelect = (event) => {
    setSelectedEvent(event)
  }

  const handlePlayPreview = () => {
    if (!videoRef.current || !selectedEvent) return

    const event = selectedEvent
    const audioUrl = selectedVariations[event.name]
    
    if (!audioUrl) {
      alert('Please select a variation for this event first')
      return
    }

    // Stop any currently playing audio
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.currentTime = 0
    }

    // Mute and play video from event start
    if (videoRef.current) {
      videoRef.current.muted = true
      videoRef.current.currentTime = event.metadata.start || 0
      videoRef.current.play()
    }

    // Play the generated audio
    const audio = new Audio(audioUrl)
    previewAudioRef.current = audio
    
    setTimeout(() => {
      audio.play()
    }, 100)

    const duration = (event.metadata.duration || 5) * 1000
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.muted = false
      }
      if (audio) {
        audio.pause()
      }
    }, duration)
  }

  const handlePlayVariation = (audioUrl, eventName, variationIdx) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.currentTime = 0
    }

    if (playingVariation === `${eventName}-${variationIdx}`) {
      setPlayingVariation(null)
      setPlayingAudio(null)
      return
    }

    const audio = new Audio(audioUrl)
    previewAudioRef.current = audio
    setPlayingVariation(`${eventName}-${variationIdx}`)
    setPlayingAudio(audioUrl)
    
    audio.play()
    audio.onended = () => {
      setPlayingVariation(null)
      setPlayingAudio(null)
    }
  }

  const handleDownloadSingleVariation = async (variationUrl, eventName, variationIdx) => {
    try {
      const response = await fetch(variationUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${eventName}_variation_${variationIdx + 1}.wav`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error(`Failed to download variation:`, error)
      alert('Failed to download audio file')
    }
  }

  const handleDownloadPack = async () => {
    const selectedAudios = []
    
    events.forEach(event => {
      const selectedVar = selectedVariations[event.name]
      if (selectedVar) {
        selectedAudios.push({
          name: event.name,
          type: event.type,
          url: selectedVar
        })
      }
    })

    if (selectedAudios.length === 0) {
      alert('Please select at least one variation to download')
      return
    }

    for (const audio of selectedAudios) {
      try {
        const response = await fetch(audio.url)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${audio.name}_${audio.type}.wav`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Failed to download ${audio.name}:`, error)
      }
    }
  }

  const allEventsHaveSelection = events.length > 0 && 
    events.every(event => selectedVariations[event.name])

  const handleGoToPlayExperience = () => {
    navigate('/play', {
      state: {
        videoUrl,
        events
      }
    })
  }

  const handleStopAll = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })

    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.currentTime = 0
    }
    
    setPlayingVariation(null)
    setPlayingAudio(null)
  }

  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause()
      })
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
      }
    }
  }, [])

  if (!videoUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.uploadSection}>
          <h2 className={styles.heading}>Create Audio Environment</h2>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Environment Video</label>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            {videoFile && (
              <span className={styles.fileName}>{videoFile.name}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Environment Description</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your game environment (e.g., 'Mystical forest with wind, birds, and rustling leaves')"
              className={styles.textarea}
              rows={4}
            />
          </div>

          <button
            onClick={handleProcess}
            disabled={loading || !videoFile || !prompt.trim()}
            className={styles.processButton}
          >
            {loading ? 'Generating Asset Pack...' : 'Generate Audio Pack'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.workspaceContainer}>
      <div className={styles.leftSidebar}>
        <h3 className={styles.sidebarTitle}>Audio Events</h3>
        {events.map((event, idx) => (
          <div 
            key={idx}
            className={`${styles.eventItem} ${selectedEvent?.name === event.name ? styles.eventSelected : ''}`}
            onClick={() => handleEventSelect(event)}
          >
            <div className={styles.eventHeader}>
              <input
                type="checkbox"
                checked={!!selectedVariations[event.name]}
                onChange={(e) => {
                  e.stopPropagation()
                  if (!selectedVariations[event.name] && event.variations[0]) {
                    handleVariationSelect(event.name, event.variations[0])
                  } else {
                    const newSelections = {...selectedVariations}
                    delete newSelections[event.name]
                    setSelectedVariations(newSelections)
                  }
                }}
                className={styles.eventCheckbox}
              />
              <div className={styles.eventInfo}>
                <div className={styles.eventName}>{event.name}</div>
                <div className={styles.eventType}>{event.type}</div>
              </div>
            </div>
            <div className={styles.eventTime}>
              Start: {event.metadata.start?.toFixed(1)}s | Duration: {event.metadata.duration?.toFixed(1)}s
            </div>
          </div>
        ))}
        
        {events.length > 0 && (
          <div className={styles.sidebarActions}>
            <button
              onClick={handleDownloadPack}
              disabled={Object.keys(selectedVariations).length === 0}
              className={styles.downloadButton}
            >
              📦 Download Pack ({Object.keys(selectedVariations).length})
            </button>
          </div>
        )}
      </div>

      <div className={styles.centerSection}>
        <video
          ref={videoRef}
          src={videoUrl}
          className={styles.videoPlayer}
          onEnded={handleStopAll}
        />
        
        <div className={styles.controls}>
          {selectedEvent && (
            <button
              onClick={handlePlayPreview}
              disabled={!selectedVariations[selectedEvent.name]}
              className={styles.previewButton}
            >
              ▶ Preview {selectedEvent.name}
            </button>
          )}
          
          <button
            onClick={handleGoToPlayExperience}
            className={styles.playButton}
          >
            🎮 Go to Play Experience
          </button>
          
          <button
            onClick={handleStopAll}
            className={styles.stopButton}
          >
            ⏹ Stop
          </button>
        </div>
      </div>

      <div className={styles.rightSidebar}>
        <h3 className={styles.sidebarTitle}>
          {selectedEvent ? `${selectedEvent.name} Variations` : 'Select Event'}
        </h3>
        
        {selectedEvent ? (
          <div className={styles.variationsContainer}>
            {selectedEvent.variations.map((variation, vIdx) => {
              const isPlaying = playingVariation === `${selectedEvent.name}-${vIdx}`
              const isSelected = selectedVariations[selectedEvent.name] === variation
              
              return (
                <div
                  key={vIdx}
                  className={`${styles.variationCard} ${isSelected ? styles.selected : ''}`}
                >
                  <div className={styles.variationHeader}>
                    <span className={styles.variationLabel}>Variation {vIdx + 1}</span>
                    <button
                      onClick={() => handlePlayVariation(variation, selectedEvent.name, vIdx)}
                      className={styles.playVariationButton}
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                  </div>
                  
                  <div className={styles.variationMeta}>
                    Duration: {selectedEvent.metadata.duration?.toFixed(1)}s
                  </div>
                  
                  <div className={styles.variationActions}>
                    <button
                      onClick={() => handleVariationSelect(selectedEvent.name, variation)}
                      className={`${styles.selectButton} ${isSelected ? styles.selectedButton : ''}`}
                    >
                      {isSelected ? '✓ Selected' : 'Select'}
                    </button>
                    
                    <button
                      onClick={() => handleDownloadSingleVariation(variation, selectedEvent.name, vIdx)}
                      className={styles.downloadSingleButton}
                    >
                      ⬇
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className={styles.emptyState}>Click an event to see its variations</p>
        )}
      </div>
    </div>
  )
}

export default WorkspacePage
