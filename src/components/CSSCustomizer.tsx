import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface CustomizationSettings {
  // Fonts
  transcriptFont: string;
  japaneseFont: string;
  koreanFont: string;
  
  // Colors (separate)
  textColor: string;
  glowColor: string;
  
  // Glow intensity (0-100)
  glowIntensity: number;
  
  // Animation type for translations
  animationType: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn' | 'none';
  
  // Animation speed
  animationSpeed: number;
  
  // Spacing
  spacing: 'tight' | 'normal' | 'loose';
  
  // Font sizes
  transcriptSize: number;
  translationSize: number;
}

const DEFAULT_SETTINGS: CustomizationSettings = {
  transcriptFont: 'system-ui, -apple-system, sans-serif',
  japaneseFont: "'Noto Sans JP', sans-serif",
  koreanFont: "'Noto Sans KR', sans-serif",
  textColor: '#ffffff',
  glowColor: '#2196F3',
  glowIntensity: 40,
  animationType: 'fadeIn',
  animationSpeed: 0.4,
  spacing: 'normal',
  transcriptSize: 3,
  translationSize: 2.5,
};

const FONT_OPTIONS = [
  { value: 'system-ui, -apple-system, sans-serif', label: 'System Default' },
  { value: "'Arial', sans-serif", label: 'Arial' },
  { value: "'Helvetica Neue', sans-serif", label: 'Helvetica' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Open Sans', sans-serif", label: 'Open Sans' },
  { value: "'Lato', sans-serif", label: 'Lato' },
  { value: "'Source Sans Pro', sans-serif", label: 'Source Sans Pro' },
  { value: "'Noto Sans', sans-serif", label: 'Noto Sans' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
];

const JAPANESE_FONTS = [
  { value: "'Noto Sans JP', sans-serif", label: 'Noto Sans Japanese' },
  { value: "'Hiragino Sans', sans-serif", label: 'Hiragino Sans' },
  { value: "'Yu Gothic', sans-serif", label: 'Yu Gothic' },
  { value: "'Meiryo', sans-serif", label: 'Meiryo' },
  { value: "'Roboto', sans-serif", label: 'Roboto (fallback)' },
];

const KOREAN_FONTS = [
  { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans Korean' },
  { value: "'Malgun Gothic', sans-serif", label: 'Malgun Gothic' },
  { value: "'Nanum Gothic', sans-serif", label: 'Nanum Gothic' },
  { value: "'Roboto', sans-serif", label: 'Roboto (fallback)' },
];

const ANIMATION_OPTIONS = [
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'scaleIn', label: 'Scale In' },
  { value: 'none', label: 'No Animation' },
];

const CSSCustomizer: React.FC = () => {
  const [settings, setSettings] = useState<CustomizationSettings>(DEFAULT_SETTINGS);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const updateSetting = useCallback((key: keyof CustomizationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const generateSpacingValues = () => {
    switch (settings.spacing) {
      case 'tight':
        return { transcriptMargin: '0.5rem', translationMargin: '0.3rem 0' };
      case 'loose':
        return { transcriptMargin: '2rem', translationMargin: '1.5rem 0' };
      default:
        return { transcriptMargin: '1rem', translationMargin: '0.8rem 0' };
    }
  };

  const generateAnimationKeyframes = () => {
    const intensity = settings.glowIntensity / 100;
    const mainColor = hexToRgba(settings.glowColor, 0.4 * intensity);
    const midColor = hexToRgba(settings.glowColor, 0.25 * intensity);
    const outerColor = hexToRgba(settings.glowColor, 0.15 * intensity);

    switch (settings.animationType) {
      case 'slideUp':
        return `
@keyframes slideUpGlow {
  0% {
    opacity: 0;
    transform: translateY(30px);
    text-shadow: 0 0 5px ${hexToRgba(settings.glowColor, 0.2 * intensity)};
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    text-shadow: 0 0 8px ${mainColor}, 0 0 15px ${midColor}, 0 0 20px ${outerColor};
  }
}`;

      case 'slideDown':
        return `
@keyframes slideDownGlow {
  0% {
    opacity: 0;
    transform: translateY(-30px);
    text-shadow: 0 0 5px ${hexToRgba(settings.glowColor, 0.2 * intensity)};
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    text-shadow: 0 0 8px ${mainColor}, 0 0 15px ${midColor}, 0 0 20px ${outerColor};
  }
}`;

      case 'scaleIn':
        return `
@keyframes scaleInGlow {
  0% {
    opacity: 0;
    transform: scale(0.8);
    text-shadow: 0 0 5px ${hexToRgba(settings.glowColor, 0.2 * intensity)};
  }
  100% {
    opacity: 1;
    transform: scale(1);
    text-shadow: 0 0 8px ${mainColor}, 0 0 15px ${midColor}, 0 0 20px ${outerColor};
  }
}`;

      case 'none':
        return `
@keyframes noAnimation {
  0%, 100% {
    opacity: 1;
    text-shadow: 0 0 8px ${mainColor}, 0 0 15px ${midColor}, 0 0 20px ${outerColor};
  }
}`;

      default: // fadeIn
        return `
@keyframes fadeInGlow {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
    filter: blur(1px);
    text-shadow: 0 0 4px ${hexToRgba(settings.glowColor, 0.2 * intensity)};
  }
  50% {
    opacity: 0.8;
    transform: translateY(3px) scale(0.99);
    filter: blur(0.5px);
    text-shadow: 0 0 6px ${hexToRgba(settings.glowColor, 0.3 * intensity)};
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
    text-shadow: 0 0 8px ${mainColor}, 0 0 15px ${midColor}, 0 0 20px ${outerColor};
  }
}`;
    }
  };

  const generateCSS = () => {
    const { transcriptMargin, translationMargin } = generateSpacingValues();
    const intensity = settings.glowIntensity / 100;
    const transcriptGlow = settings.glowIntensity > 0 
      ? `text-shadow: 0 0 5px ${hexToRgba(settings.glowColor, 0.15 * intensity)}, 0 0 10px ${hexToRgba(settings.glowColor, 0.1 * intensity)} !important;`
      : 'text-shadow: none !important;';
    
    const translationGlow = settings.glowIntensity > 0
      ? `text-shadow: 0 0 8px ${hexToRgba(settings.glowColor, 0.4 * intensity)}, 0 0 15px ${hexToRgba(settings.glowColor, 0.25 * intensity)}, 0 0 20px ${hexToRgba(settings.glowColor, 0.15 * intensity)} !important;`
      : 'text-shadow: none !important;';

    const animationName = settings.animationType === 'slideUp' ? 'slideUpGlow' :
                         settings.animationType === 'slideDown' ? 'slideDownGlow' :
                         settings.animationType === 'scaleIn' ? 'scaleInGlow' :
                         settings.animationType === 'none' ? 'noAnimation' : 'fadeInGlow';

    return `/* Custom OBS CSS Generated by CATT CSS Customizer */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;500;700&family=Lato:wght@400;500;700&family=Source+Sans+Pro:wght@400;500;700&family=Inter:wght@400;500;700&family=Poppins:wght@400;500;700&display=swap');

/* Transcript line */
.transcript-line {
  font-family: ${settings.transcriptFont} !important;
  font-size: ${settings.transcriptSize}rem !important;
  font-weight: 600 !important;
  color: ${settings.textColor} !important;
  text-align: center !important;
  margin-bottom: ${transcriptMargin} !important;
  line-height: 1.2 !important;
  ${transcriptGlow}
  animation: none !important;
  transition: none !important;
  opacity: 1 !important;
}

/* Base styling for translation lines */
.translation-line {
  font-size: ${settings.translationSize}rem !important;
  font-weight: 500 !important;
  text-align: center !important;
  margin: ${translationMargin} !important;
  line-height: 1.3 !important;
  opacity: 0;
  transform: translateY(5px);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Japanese text (any line) */
.translation-ja {
  font-family: ${settings.japaneseFont} !important;
  color: ${settings.textColor} !important;
  ${translationGlow}
  animation: ${animationName} ${settings.animationSpeed}s ease-out forwards !important;
}

/* Korean text (any line) */
.translation-ko {
  font-family: ${settings.koreanFont} !important;
  color: ${settings.textColor} !important;
  ${translationGlow}
  animation: ${animationName} ${settings.animationSpeed}s ease-out 0.2s forwards !important;
}

${generateAnimationKeyframes()}

/* Reset animation when content changes */
.animate-update .translation-line {
  animation-duration: ${settings.animationSpeed}s !important;
  animation-fill-mode: forwards !important;
  animation-timing-function: ease-out !important;
}

/* Remove conflicting animations from sliding text */
.transcript-line.sliding-text {
  opacity: 1 !important;
}

/* Ensure proper stacking and visibility */
.export-view {
  position: relative !important;
  z-index: 1000 !important;
}

/* Make sure animations work properly in OBS */
.translation-line {
  will-change: opacity, transform !important;
  backface-visibility: hidden !important;
}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateCSS());
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 3000);
    } catch (err) {
      console.error('Failed to copy CSS to clipboard:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Main App
          </Link>
          <h1 className="text-4xl font-bold mb-2">CSS Customizer</h1>
          <p className="text-gray-400">Customize the appearance of your OBS captions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Font Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Transcript Font</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={settings.transcriptFont}
                    onChange={(e) => updateSetting('transcriptFont', e.target.value)}
                  >
                    {FONT_OPTIONS.map(font => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Japanese Text Font</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={settings.japaneseFont}
                    onChange={(e) => updateSetting('japaneseFont', e.target.value)}
                  >
                    {JAPANESE_FONTS.map(font => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Korean Text Font</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={settings.koreanFont}
                    onChange={(e) => updateSetting('koreanFont', e.target.value)}
                  >
                    {KOREAN_FONTS.map(font => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Appearance</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Text Color</label>
                  <input
                    type="color"
                    className="w-full h-10 rounded-lg border border-gray-700 bg-gray-800"
                    value={settings.textColor}
                    onChange={(e) => updateSetting('textColor', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Glow Color</label>
                  <input
                    type="color"
                    className="w-full h-10 rounded-lg border border-gray-700 bg-gray-800"
                    value={settings.glowColor}
                    onChange={(e) => updateSetting('glowColor', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Glow Intensity: {settings.glowIntensity}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="w-full"
                    value={settings.glowIntensity}
                    onChange={(e) => updateSetting('glowIntensity', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Spacing</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={settings.spacing}
                    onChange={(e) => updateSetting('spacing', e.target.value)}
                  >
                    <option value="tight">Tight</option>
                    <option value="normal">Normal</option>
                    <option value="loose">Loose</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Font Sizes</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Transcript Size: {settings.transcriptSize}rem
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    className="w-full"
                    value={settings.transcriptSize}
                    onChange={(e) => updateSetting('transcriptSize', parseFloat(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Translation Size: {settings.translationSize}rem
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.1"
                    className="w-full"
                    value={settings.translationSize}
                    onChange={(e) => updateSetting('translationSize', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Animation (Translations Only)</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Animation Type</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={settings.animationType}
                    onChange={(e) => updateSetting('animationType', e.target.value)}
                  >
                    {ANIMATION_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Animation Speed: {settings.animationSpeed}s
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    className="w-full"
                    value={settings.animationSpeed}
                    onChange={(e) => updateSetting('animationSpeed', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={copyToClipboard}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                copiedToClipboard 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {copiedToClipboard ? '✅ Copied to Clipboard!' : '📋 Export CSS'}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
              
              <div className="bg-black rounded-lg p-8 min-h-[400px] flex flex-col justify-center space-y-4">
                <div 
                  className="transcript-line"
                  style={{
                    fontFamily: settings.transcriptFont,
                    fontSize: `${settings.transcriptSize}rem`,
                    fontWeight: 600,
                    color: settings.textColor,
                    textAlign: 'center',
                    marginBottom: generateSpacingValues().transcriptMargin,
                    lineHeight: 1.2,
                    textShadow: settings.glowIntensity > 0 
                      ? `0 0 6px ${hexToRgba(settings.glowColor, 0.2 * (settings.glowIntensity / 100))}, 0 0 12px ${hexToRgba(settings.glowColor, 0.15 * (settings.glowIntensity / 100))}, 0 0 18px ${hexToRgba(settings.glowColor, 0.1 * (settings.glowIntensity / 100))}`
                      : 'none',
                  }}
                >
                  This is the transcript line
                </div>
                
                <div 
                  className="translation-line translation-ja"
                  style={{
                    fontFamily: settings.japaneseFont,
                    fontSize: `${settings.translationSize}rem`,
                    fontWeight: 500,
                    color: settings.textColor,
                    textAlign: 'center',
                    margin: generateSpacingValues().translationMargin,
                    lineHeight: 1.3,
                    opacity: 1,
                    textShadow: settings.glowIntensity > 0 
                      ? `0 0 8px ${hexToRgba(settings.glowColor, 0.25 * (settings.glowIntensity / 100))}, 0 0 16px ${hexToRgba(settings.glowColor, 0.2 * (settings.glowIntensity / 100))}, 0 0 24px ${hexToRgba(settings.glowColor, 0.15 * (settings.glowIntensity / 100))}, 0 0 32px ${hexToRgba(settings.glowColor, 0.1 * (settings.glowIntensity / 100))}`
                      : 'none',
                  }}
                >
                  これは日本語の翻訳です
                </div>
                
                <div 
                  className="translation-line translation-ko"
                  style={{
                    fontFamily: settings.koreanFont,
                    fontSize: `${settings.translationSize}rem`,
                    fontWeight: 500,
                    color: settings.textColor,
                    textAlign: 'center',
                    margin: generateSpacingValues().translationMargin,
                    lineHeight: 1.3,
                    opacity: 1,
                    textShadow: settings.glowIntensity > 0
                      ? `0 0 8px ${hexToRgba(settings.glowColor, 0.25 * (settings.glowIntensity / 100))}, 0 0 16px ${hexToRgba(settings.glowColor, 0.2 * (settings.glowIntensity / 100))}, 0 0 24px ${hexToRgba(settings.glowColor, 0.15 * (settings.glowIntensity / 100))}, 0 0 32px ${hexToRgba(settings.glowColor, 0.1 * (settings.glowIntensity / 100))}`
                      : 'none',
                  }}
                >
                  이것은 한국어 번역입니다
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                <li>Customize your settings using the controls on the left</li>
                <li>Preview your changes in the black preview area above</li>
                <li>When satisfied, click "Export CSS" to copy the code</li>
                <li>In OBS, add a Browser Source with your export URL</li>
                <li>Paste the CSS code into the "Custom CSS" field</li>
                <li>Your captions will now use your custom styling!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSSCustomizer; 