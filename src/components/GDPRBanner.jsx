import { useState, useEffect } from 'react'
import './GDPRBanner.css'

export default function GDPRBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false
  })

  useEffect(() => {
    // Check if user has already consented
    const consentData = localStorage.getItem('gdpr_consent')
    if (consentData) {
      try {
        const parsed = JSON.parse(consentData)
        if (parsed.status === 'accepted') {
          return
        }
      } catch (e) {
        // Invalid JSON, show banner
      }
    }
    // Show banner after 1 second
    setTimeout(() => setShowBanner(true), 500)
  }, [])

  const saveConsent = (status, prefs = null) => {
    const consentData = {
      status: status,
      date: new Date().toISOString(),
      preferences: prefs || preferences
    }
    localStorage.setItem('gdpr_consent', JSON.stringify(consentData))
    setShowBanner(false)
    setShowSettings(false)
    
    // Track consent for analytics (without cookies)
    console.log('GDPR Consent:', status, new Date().toISOString())
  }

  const acceptAll = () => {
    const allTrue = {
      necessary: true,
      analytics: true,
      marketing: true
    }
    saveConsent('accepted', allTrue)
  }

  const acceptNecessary = () => {
    saveConsent('accepted')
  }

  const savePreferences = () => {
    saveConsent('accepted', preferences)
  }

  const declineAll = () => {
    saveConsent('declined', {
      necessary: true,
      analytics: false,
      marketing: false
    })
  }

  if (!showBanner) return null

  return (
    <div className="gdpr-overlay">
      <div className="gdpr-banner">
        <div className="gdpr-container">
          {/* Header */}
          <div className="gdpr-header">
            <div className="gdpr-icon">
              <span>🔒</span>
            </div>
            <div>
              <h2>Your Privacy Matters</h2>
              <p>We use cookies to enhance your experience</p>
            </div>
          </div>

          {/* Content */}
          <div className="gdpr-content">
            <p>
              We and our partners use cookies to store and access personal data 
              such as browsing data for purposes such as serving and personalizing 
              content and analyzing site traffic.
            </p>
            
            <div className="gdpr-compliance">
              <div className="compliance-item">
                <span className="compliance-icon">✅</span>
                <span>GDPR Compliant</span>
              </div>
              <div className="compliance-item">
                <span className="compliance-icon">🔐</span>
                <span>Data Encrypted</span>
              </div>
              <div className="compliance-item">
                <span className="compliance-icon">🛡️</span>
                <span>No Third-Party Sharing</span>
              </div>
            </div>
          </div>

          {/* Cookie Preferences Section */}
          {showSettings && (
            <div className="gdpr-preferences">
              <h3>Cookie Preferences</h3>
              <div className="preference-item">
                <div className="pref-info">
                  <strong>Necessary Cookies</strong>
                  <p>Required for basic site functionality and security.</p>
                </div>
                <div className="pref-toggle">
                  <span className="pref-always">Always Active</span>
                </div>
              </div>
              <div className="preference-item">
                <div className="pref-info">
                  <strong>Analytics Cookies</strong>
                  <p>Help us understand how visitors interact with our site.</p>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="preference-item">
                <div className="pref-info">
                  <strong>Marketing Cookies</strong>
                  <p>Used to deliver relevant advertisements.</p>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <button className="gdpr-save-prefs" onClick={savePreferences}>
                Save Preferences
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className="gdpr-buttons">
            <button className="gdpr-btn-outline" onClick={() => setShowSettings(!showSettings)}>
              {showSettings ? 'Hide Preferences' : 'Cookie Settings'}
            </button>
            <button className="gdpr-btn-outline" onClick={declineAll}>
              Decline All
            </button>
            <button className="gdpr-btn-primary" onClick={acceptAll}>
              Accept All
            </button>
          </div>

          {/* Footer Links */}
          <div className="gdpr-footer">
            <button className="gdpr-link" onClick={() => alert('Privacy Policy: We collect only necessary data for birthday notifications. Data is encrypted and never sold to third parties. You can request data deletion at any time.')}>
              Privacy Policy
            </button>
            <span className="gdpr-separator">•</span>
            <button className="gdpr-link" onClick={() => alert('Cookie Policy: We use essential cookies for authentication and preferences. Analytics cookies are optional. No tracking cookies are used for marketing without consent.')}>
              Cookie Policy
            </button>
            <span className="gdpr-separator">•</span>
            <button className="gdpr-link" onClick={() => alert('You can change your consent preferences at any time by clearing your browser cache or contacting our support team.')}>
              Manage Consent
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}