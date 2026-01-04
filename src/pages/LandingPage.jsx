import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'
import bgImage from '../assets/background.png'

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      <div 
        className={styles.background}
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      
      <div className={styles.content}>
        <h1 className={styles.title}>Game Audio Asset Pack Generator</h1>
        <p className={styles.description}>
          Transform your environment videos into professional audio asset packs for game development. 
          Describe your game environment, upload a reference video, and generate high-quality loops and emitters 
          with multiple variations. Export complete audio packs ready for Unity, Unreal, or any game engine.
        </p>
        
        <button 
          className={styles.ctaButton}
          onClick={() => navigate('/workspace')}
        >
          Generate Audio Pack
        </button>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🎮</span>
            <span className={styles.featureText}>Game-Ready Assets</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🎵</span>
            <span className={styles.featureText}>Multiple Variations</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>📦</span>
            <span className={styles.featureText}>Export Audio Packs</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
