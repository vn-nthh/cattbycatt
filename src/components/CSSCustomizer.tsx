import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface CustomizationSettings {
  // Fonts
  transcriptFont: string;
  japaneseFont: string;
  koreanFont: string;

  // Colors (separate)
  textColor: string;
  // Glow settings
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: number;

  // Text border/stroke
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;

  // Shadow settings
  shadowEnabled: boolean;
  shadowColor: string;

  // Animation type for translations
  animationType: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn' | 'none';

  // Animation speed
  animationSpeed: number;

  // Spacing
  spacing: 'tight' | 'normal' | 'loose';

  // Font sizes
  transcriptSize: number;
  translationSize: number;

  // Stagger settings
  staggerEnabled: boolean;
  staggerTime: number;
}

const DEFAULT_SETTINGS: CustomizationSettings = {
  transcriptFont: 'system-ui, -apple-system, sans-serif',
  japaneseFont: "'Noto Sans JP', sans-serif",
  koreanFont: "'Noto Sans KR', sans-serif",
  textColor: '#ffffff',
  glowEnabled: true,
  glowColor: '#2196F3',
  glowIntensity: 50,
  borderEnabled: false,
  borderColor: '#000000',
  borderWidth: 0,
  animationType: 'none',
  animationSpeed: 0.4,
  spacing: 'normal',
  transcriptSize: 2.5,
  translationSize: 2.5,
  staggerEnabled: false,
  staggerTime: 0.3,
  shadowEnabled: true,
  shadowColor: '#000000',
};

// Preset type definition
type PresetType = 'default' | 'sophisticated' | 'whimsy' | 'custom';

// Preset configurations
const PRESETS: Record<Exclude<PresetType, 'custom'>, CustomizationSettings> = {
  default: {
    transcriptFont: 'system-ui, -apple-system, sans-serif',
    japaneseFont: "'Noto Sans JP', sans-serif",
    koreanFont: "'Noto Sans KR', sans-serif",
    textColor: '#ffffff',
    glowEnabled: true,
    glowColor: '#2196F3',
    glowIntensity: 50,
    borderEnabled: false,
    borderColor: '#000000',
    borderWidth: 0,
    animationType: 'none',
    animationSpeed: 0.4,
    spacing: 'normal',
    transcriptSize: 2.5,
    translationSize: 2.5,
    staggerEnabled: false,
    staggerTime: 0.3,
    shadowEnabled: true,
    shadowColor: '#000000',
  },
  sophisticated: {
    transcriptFont: "'Playfair Display', serif",
    japaneseFont: "'Shippori Mincho', serif",
    koreanFont: "'Nanum Myeongjo', serif",
    textColor: '#f0e6d3',
    glowEnabled: true,
    glowColor: '#8b7355',
    glowIntensity: 30,
    borderEnabled: true,
    borderColor: '#2a2015',
    borderWidth: 1,
    animationType: 'fadeIn',
    animationSpeed: 0.6,
    spacing: 'loose',
    transcriptSize: 2.8,
    translationSize: 2.4,
    staggerEnabled: true,
    staggerTime: 0.3,
    shadowEnabled: true,
    shadowColor: '#000000',
  },
  whimsy: {
    transcriptFont: "'Fredoka One', cursive",
    japaneseFont: "'M PLUS Rounded 1c', sans-serif",
    koreanFont: "'Jua', sans-serif",
    textColor: '#fff5f8',
    glowEnabled: true,
    glowColor: '#ff6b9d',
    glowIntensity: 75,
    borderEnabled: true,
    borderColor: '#ff1493',
    borderWidth: 2,
    animationType: 'scaleIn',
    animationSpeed: 0.3,
    spacing: 'normal',
    transcriptSize: 2.6,
    translationSize: 2.4,
    staggerEnabled: false,
    staggerTime: 0.3,
    shadowEnabled: true,
    shadowColor: '#000000',
  },
};

const FONT_OPTIONS = [
  // System Fonts
  { value: 'system-ui, -apple-system, sans-serif', label: 'System Default', category: 'System' },

  // Popular Sans-Serif Fonts
  { value: "'Inter', sans-serif", label: 'Inter', category: 'Sans-Serif' },
  { value: "'Roboto', sans-serif", label: 'Roboto', category: 'Sans-Serif' },
  { value: "'Open Sans', sans-serif", label: 'Open Sans', category: 'Sans-Serif' },
  { value: "'Lato', sans-serif", label: 'Lato', category: 'Sans-Serif' },
  { value: "'Source Sans Pro', sans-serif", label: 'Source Sans Pro', category: 'Sans-Serif' },
  { value: "'Poppins', sans-serif", label: 'Poppins', category: 'Sans-Serif' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat', category: 'Sans-Serif' },
  { value: "'Nunito', sans-serif", label: 'Nunito', category: 'Sans-Serif' },
  { value: "'Raleway', sans-serif", label: 'Raleway', category: 'Sans-Serif' },
  { value: "'Ubuntu', sans-serif", label: 'Ubuntu', category: 'Sans-Serif' },
  { value: "'Fira Sans', sans-serif", label: 'Fira Sans', category: 'Sans-Serif' },
  { value: "'Work Sans', sans-serif", label: 'Work Sans', category: 'Sans-Serif' },
  { value: "'PT Sans', sans-serif", label: 'PT Sans', category: 'Sans-Serif' },
  { value: "'Noto Sans', sans-serif", label: 'Noto Sans', category: 'Sans-Serif' },
  { value: "'Quicksand', sans-serif", label: 'Quicksand', category: 'Sans-Serif' },
  { value: "'Rubik', sans-serif", label: 'Rubik', category: 'Sans-Serif' },
  { value: "'DM Sans', sans-serif", label: 'DM Sans', category: 'Sans-Serif' },
  { value: "'Manrope', sans-serif", label: 'Manrope', category: 'Sans-Serif' },
  { value: "'Plus Jakarta Sans', sans-serif", label: 'Plus Jakarta Sans', category: 'Sans-Serif' },
  { value: "'Outfit', sans-serif", label: 'Outfit', category: 'Sans-Serif' },
  { value: "'Space Grotesk', sans-serif", label: 'Space Grotesk', category: 'Sans-Serif' },
  { value: "'Lexend', sans-serif", label: 'Lexend', category: 'Sans-Serif' },
  { value: "'Archivo', sans-serif", label: 'Archivo', category: 'Sans-Serif' },
  { value: "'IBM Plex Sans', sans-serif", label: 'IBM Plex Sans', category: 'Sans-Serif' },
  { value: "'Red Hat Display', sans-serif", label: 'Red Hat Display', category: 'Sans-Serif' },
  { value: "'Libre Franklin', sans-serif", label: 'Libre Franklin', category: 'Sans-Serif' },
  { value: "'Barlow', sans-serif", label: 'Barlow', category: 'Sans-Serif' },
  { value: "'Karla', sans-serif", label: 'Karla', category: 'Sans-Serif' },
  { value: "'Mukti', sans-serif", label: 'Mukti', category: 'Sans-Serif' },

  // Serif Fonts
  { value: "'Playfair Display', serif", label: 'Playfair Display', category: 'Serif' },
  { value: "'Merriweather', serif", label: 'Merriweather', category: 'Serif' },
  { value: "'Lora', serif", label: 'Lora', category: 'Serif' },
  { value: "'Source Serif Pro', serif", label: 'Source Serif Pro', category: 'Serif' },
  { value: "'Crimson Text', serif", label: 'Crimson Text', category: 'Serif' },
  { value: "'PT Serif', serif", label: 'PT Serif', category: 'Serif' },
  { value: "'Libre Baskerville', serif", label: 'Libre Baskerville', category: 'Serif' },
  { value: "'Cormorant Garamond', serif", label: 'Cormorant Garamond', category: 'Serif' },
  { value: "'EB Garamond', serif", label: 'EB Garamond', category: 'Serif' },
  { value: "'Noto Serif', serif", label: 'Noto Serif', category: 'Serif' },
  { value: "'Vollkorn', serif", label: 'Vollkorn', category: 'Serif' },
  { value: "'Alegreya', serif", label: 'Alegreya', category: 'Serif' },
  { value: "'Spectral', serif", label: 'Spectral', category: 'Serif' },
  { value: "'IBM Plex Serif', serif", label: 'IBM Plex Serif', category: 'Serif' },
  { value: "'Arvo', serif", label: 'Arvo', category: 'Serif' },
  { value: "'Rokkitt', serif", label: 'Rokkitt', category: 'Serif' },
  { value: "'Old Standard TT', serif", label: 'Old Standard TT', category: 'Serif' },
  { value: "'Bitter', serif", label: 'Bitter', category: 'Serif' },
  { value: "'Zilla Slab', serif", label: 'Zilla Slab', category: 'Serif' },
  { value: "'Cardo', serif", label: 'Cardo', category: 'Serif' },

  // Handwritten/Script Fonts
  { value: "'Dancing Script', cursive", label: 'Dancing Script', category: 'Handwritten' },
  { value: "'Pacifico', cursive", label: 'Pacifico', category: 'Handwritten' },
  { value: "'Caveat', cursive", label: 'Caveat', category: 'Handwritten' },
  { value: "'Kalam', cursive", label: 'Kalam', category: 'Handwritten' },
  { value: "'Indie Flower', cursive", label: 'Indie Flower', category: 'Handwritten' },
  { value: "'Permanent Marker', cursive", label: 'Permanent Marker', category: 'Handwritten' },
  { value: "'Shadows Into Light', cursive", label: 'Shadows Into Light', category: 'Handwritten' },
  { value: "'Amatic SC', cursive", label: 'Amatic SC', category: 'Handwritten' },
  { value: "'Satisfy', cursive", label: 'Satisfy', category: 'Handwritten' },
  { value: "'Handlee', cursive", label: 'Handlee', category: 'Handwritten' },
  { value: "'Courgette', cursive", label: 'Courgette', category: 'Handwritten' },
  { value: "'Kaushan Script', cursive", label: 'Kaushan Script', category: 'Handwritten' },
  { value: "'Great Vibes', cursive", label: 'Great Vibes', category: 'Handwritten' },
  { value: "'Lobster', cursive", label: 'Lobster', category: 'Handwritten' },
  { value: "'Righteous', cursive", label: 'Righteous', category: 'Handwritten' },

  // Monospace Fonts
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono', category: 'Monospace' },
  { value: "'Fira Code', monospace", label: 'Fira Code', category: 'Monospace' },
  { value: "'Source Code Pro', monospace", label: 'Source Code Pro', category: 'Monospace' },
  { value: "'IBM Plex Mono', monospace", label: 'IBM Plex Mono', category: 'Monospace' },
  { value: "'Roboto Mono', monospace", label: 'Roboto Mono', category: 'Monospace' },
  { value: "'Space Mono', monospace", label: 'Space Mono', category: 'Monospace' },
  { value: "'Inconsolata', monospace", label: 'Inconsolata', category: 'Monospace' },
  { value: "'Ubuntu Mono', monospace", label: 'Ubuntu Mono', category: 'Monospace' },

  // Display Fonts (Legible)
  { value: "'Oswald', sans-serif", label: 'Oswald', category: 'Display' },
  { value: "'Bebas Neue', cursive", label: 'Bebas Neue', category: 'Display' },
  { value: "'Anton', sans-serif", label: 'Anton', category: 'Display' },
  { value: "'Fjalla One', sans-serif", label: 'Fjalla One', category: 'Display' },
  { value: "'Russo One', sans-serif", label: 'Russo One', category: 'Display' },
  { value: "'Comfortaa', cursive", label: 'Comfortaa', category: 'Display' },
  { value: "'Fredoka One', cursive", label: 'Fredoka One', category: 'Display' },
  { value: "'Bangers', cursive", label: 'Bangers', category: 'Display' },
  { value: "'Righteous', cursive", label: 'Righteous', category: 'Display' },
  { value: "'Alfa Slab One', cursive", label: 'Alfa Slab One', category: 'Display' },
];

const JAPANESE_FONTS = [
  { value: "'Noto Sans JP', sans-serif", label: 'Noto Sans Japanese', category: 'Sans-Serif' },
  { value: "'Noto Serif JP', serif", label: 'Noto Serif Japanese', category: 'Serif' },
  { value: "'M PLUS Rounded 1c', sans-serif", label: 'M PLUS Rounded 1c', category: 'Sans-Serif' },
  { value: "'M PLUS 1p', sans-serif", label: 'M PLUS 1p', category: 'Sans-Serif' },
  { value: "'Sawarabi Gothic', sans-serif", label: 'Sawarabi Gothic', category: 'Sans-Serif' },
  { value: "'Sawarabi Mincho', serif", label: 'Sawarabi Mincho', category: 'Serif' },
  { value: "'Kosugi', sans-serif", label: 'Kosugi', category: 'Sans-Serif' },
  { value: "'Kosugi Maru', sans-serif", label: 'Kosugi Maru', category: 'Sans-Serif' },
  { value: "'Zen Kaku Gothic New', sans-serif", label: 'Zen Kaku Gothic New', category: 'Sans-Serif' },
  { value: "'Zen Kaku Gothic Antique', sans-serif", label: 'Zen Kaku Gothic Antique', category: 'Sans-Serif' },
  { value: "'Zen Old Mincho', serif", label: 'Zen Old Mincho', category: 'Serif' },
  { value: "'Kiwi Maru', serif", label: 'Kiwi Maru', category: 'Serif' },
  { value: "'Shippori Mincho', serif", label: 'Shippori Mincho', category: 'Serif' },
  { value: "'BIZ UDGothic', sans-serif", label: 'BIZ UD Gothic', category: 'Sans-Serif' },
  { value: "'BIZ UDMincho', serif", label: 'BIZ UD Mincho', category: 'Serif' },
  { value: "'Kaisei Opti', serif", label: 'Kaisei Opti', category: 'Serif' },
  { value: "'Kaisei HarunoUmi', serif", label: 'Kaisei HarunoUmi', category: 'Serif' },
  { value: "'Yomogi', cursive", label: 'Yomogi (Handwritten)', category: 'Handwritten' },
  { value: "'Klee One', cursive", label: 'Klee One (Handwritten)', category: 'Handwritten' },
  { value: "'Reggae One', cursive", label: 'Reggae One (Display)', category: 'Display' },
  // Fallback options
  { value: "'Hiragino Sans', sans-serif", label: 'Hiragino Sans (System)', category: 'System' },
  { value: "'Yu Gothic', sans-serif", label: 'Yu Gothic (System)', category: 'System' },
  { value: "'Meiryo', sans-serif", label: 'Meiryo (System)', category: 'System' },
  { value: "'Roboto', sans-serif", label: 'Roboto (Fallback)', category: 'Fallback' },
];

const KOREAN_FONTS = [
  { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans Korean', category: 'Sans-Serif' },
  { value: "'Noto Serif KR', serif", label: 'Noto Serif Korean', category: 'Serif' },
  { value: "'IBM Plex Sans KR', sans-serif", label: 'IBM Plex Sans Korean', category: 'Sans-Serif' },
  { value: "'Nanum Gothic', sans-serif", label: 'Nanum Gothic', category: 'Sans-Serif' },
  { value: "'Nanum Myeongjo', serif", label: 'Nanum Myeongjo', category: 'Serif' },
  { value: "'Nanum Gothic Coding', monospace", label: 'Nanum Gothic Coding', category: 'Monospace' },
  { value: "'Do Hyeon', sans-serif", label: 'Do Hyeon', category: 'Sans-Serif' },
  { value: "'Jua', sans-serif", label: 'Jua', category: 'Sans-Serif' },
  { value: "'Gamja Flower', cursive", label: 'Gamja Flower (Handwritten)', category: 'Handwritten' },
  { value: "'Gugi', cursive", label: 'Gugi (Display)', category: 'Display' },
  { value: "'Single Day', cursive", label: 'Single Day (Handwritten)', category: 'Handwritten' },
  { value: "'Cute Font', cursive", label: 'Cute Font (Display)', category: 'Display' },
  { value: "'Gaegu', cursive", label: 'Gaegu (Handwritten)', category: 'Handwritten' },
  { value: "'Poor Story', cursive", label: 'Poor Story (Handwritten)', category: 'Handwritten' },
  { value: "'Stylish', sans-serif", label: 'Stylish', category: 'Sans-Serif' },
  { value: "'East Sea Dokdo', cursive", label: 'East Sea Dokdo (Handwritten)', category: 'Handwritten' },
  { value: "'Hi Melody', cursive", label: 'Hi Melody (Handwritten)', category: 'Handwritten' },
  { value: "'Sunflower', sans-serif", label: 'Sunflower', category: 'Sans-Serif' },
  // System fallback options
  { value: "'Malgun Gothic', sans-serif", label: 'Malgun Gothic (System)', category: 'System' },
  { value: "'Apple Gothic', sans-serif", label: 'Apple Gothic (System)', category: 'System' },
  { value: "'Roboto', sans-serif", label: 'Roboto (Fallback)', category: 'Fallback' },
];

const ANIMATION_OPTIONS = [
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'scaleIn', label: 'Scale In' },
  { value: 'none', label: 'No Animation' },
];

// Custom Font Selector Component
interface FontSelectorProps {
  fonts: Array<{ value: string; label: string; category: string }>;
  value: string;
  onChange: (value: string) => void;
  label: string;
  onFontLoad?: (fontFamily: string) => void;
  translations: Translations;
}

const FontSelector: React.FC<FontSelectorProps> = ({ fonts, value, onChange, label, onFontLoad, translations: t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current font label
  const currentFont = fonts.find(font => font.value === value);
  const currentFontLabel = currentFont?.label || t.selectFont;

  // Filter fonts based on search
  const filteredFonts = fonts.filter(font =>
    font.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group filtered fonts by category with translations
  const categorizedFonts = filteredFonts.reduce((acc, font) => {
    const translatedCategory = translateCategory(font.category, t);
    if (!acc[translatedCategory]) {
      acc[translatedCategory] = [];
    }
    acc[translatedCategory].push(font);
    return acc;
  }, {} as Record<string, typeof fonts>);

  const handleFontSelect = (fontValue: string) => {
    onChange(fontValue);
    // Trigger font loading
    if (onFontLoad) {
      onFontLoad(fontValue);
    }
    // Don't close dropdown - let user continue browsing
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-2">{label}</label>

      {/* Selected font display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-[#606060] border border-[#efefef]/50 rounded-lg focus:ring-2 focus:ring-[#efefef]/50 text-left flex justify-between items-center text-[#efefef] hover:bg-[#707070] transition-colors"
      >
        <span style={{ fontFamily: value }}>{currentFontLabel}</span>
        <svg
          className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#2d2d2d] border border-[#efefef]/30 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Search box */}
          <div className="p-3 border-b border-[#efefef]/20">
            <input
              type="text"
              placeholder={t.searchFonts}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 bg-[#1e1e1e] border border-[#efefef]/30 rounded text-sm focus:ring-1 focus:ring-[#efefef]/50 text-[#efefef]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Font list */}
          <div className="overflow-y-auto max-h-80">
            {Object.entries(categorizedFonts).map(([category, categoryFonts]) => (
              <div key={category}>
                {/* Category header */}
                <div className="px-3 py-2 bg-[#404040] text-xs font-semibold text-[#efefef]/70 sticky top-0">
                  {category}
                </div>

                {/* Fonts in category */}
                {categoryFonts.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => handleFontSelect(font.value)}
                    className={`w-full px-3 py-2 text-left hover:bg-[#505050] transition-colors ${font.value === value ? 'bg-[#606060] text-[#efefef]' : 'text-[#efefef]/80'
                      }`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            ))}

            {filteredFonts.length === 0 && (
              <div className="px-3 py-4 text-[#606060] text-center">
                {t.noFontsFound} "{searchTerm}"
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="p-2 border-t border-[#efefef]/20 bg-[#2d2d2d]">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-1 bg-[#606060] hover:bg-[#707070] rounded text-sm transition-colors text-[#efefef]"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to translate category names
const translateCategory = (category: string, t: Translations): string => {
  switch (category) {
    case 'System': return t.system;
    case 'Sans-Serif': return t.sansSerif;
    case 'Serif': return t.serif;
    case 'Handwritten': return t.handwritten;
    case 'Monospace': return t.monospace;
    case 'Display': return t.display;
    case 'Fallback': return t.fallback;
    default: return category;
  }
};

// Internationalization
interface Translations {
  // Navigation
  backToMain: string;
  cssCustomizer: string;
  customizeAppearance: string;

  // Presets
  stylePresets: string;
  presetDefault: string;
  presetSophisticated: string;
  presetWhimsy: string;
  presetCustom: string;
  presetDefaultDesc: string;
  presetSophisticatedDesc: string;
  presetWhimsyDesc: string;
  presetCustomDesc: string;

  // Font Settings
  fontSettings: string;
  transcriptFont: string;
  englishTextFont: string;
  japaneseTextFont: string;
  koreanTextFont: string;
  searchFonts: string;
  selectFont: string;
  close: string;
  noFontsFound: string;

  // Appearance
  appearance: string;
  textColor: string;
  enableGlow: string;
  glowColor: string;
  glowIntensity: string;
  enableBorder: string;
  borderColor: string;
  borderWidth: string;
  enableShadow: string;
  shadowColor: string;
  spacing: string;
  tight: string;
  normal: string;
  loose: string;

  // Font Sizes
  fontSizes: string;
  transcriptSize: string;
  translationSize: string;

  // Animation Stagger
  enableStagger: string;
  staggerTime: string;

  // Animation
  animationTranslationsOnly: string;
  animationType: string;
  animationSpeed: string;
  fadeIn: string;
  slideUp: string;
  slideDown: string;
  scaleIn: string;
  noAnimation: string;

  // Actions
  exportCSS: string;
  copiedToClipboard: string;

  // Preview
  livePreview: string;
  loadingFonts: string;
  transcriptSample: string;
  japaneseSample: string;
  koreanSample: string;

  // Instructions
  instructions: string;
  instruction1: string;
  instruction2: string;
  instruction3: string;
  instruction4: string;
  instruction5: string;
  instruction6: string;

  // Help Section - CSS Documentation
  howToMakeOwnCSS: string;
  helpIntro: string;

  // CSS Class Reference
  helpCSSReferenceTitle: string;
  helpGlobalTitle: string;
  helpGlobalDesc: string;
  helpLanguageTitle: string;
  helpLanguageDesc: string;
  helpRoleTitle: string;
  helpRoleDesc: string;
  helpAnimationsTitle: string;
  helpAnimationsDesc: string;

  // Tips
  helpTipsTitle: string;
  helpTip1: string;
  helpTip2: string;
  helpTip3: string;

  // Categories
  system: string;
  sansSerif: string;
  serif: string;
  handwritten: string;
  monospace: string;
  display: string;
  fallback: string;
}

const translations: Record<string, Translations> = {
  en: {
    // Navigation
    backToMain: "← Back to Main App",
    cssCustomizer: "CSS Customizer",
    customizeAppearance: "Customize the appearance of your OBS captions",

    // Font Settings
    fontSettings: "Font Settings",
    transcriptFont: "Transcript Font",
    englishTextFont: "English Text Font",
    japaneseTextFont: "Japanese Text Font",
    koreanTextFont: "Korean Text Font",
    searchFonts: "Search fonts...",
    selectFont: "Select a font",
    close: "Close",
    noFontsFound: "No fonts found matching",

    // Appearance
    appearance: "Appearance",
    textColor: "Text Color",
    enableGlow: "Enable Glow",
    glowColor: "Glow Color",
    glowIntensity: "Glow Intensity",
    enableBorder: "Enable Border",
    borderColor: "Border Color",
    borderWidth: "Border Width",
    enableShadow: "Enable Shadow",
    shadowColor: "Shadow Color",
    spacing: "Spacing",
    tight: "Tight",
    normal: "Normal",
    loose: "Loose",

    // Font Sizes
    fontSizes: "Font Sizes",
    transcriptSize: "Transcript Size",
    translationSize: "Translation Size",

    // Animation Stagger
    enableStagger: "Stagger Lines",
    staggerTime: "Stagger Time",

    // Animation
    animationTranslationsOnly: "Animation (Translations Only)",
    animationType: "Animation Type",
    animationSpeed: "Animation Speed",
    fadeIn: "Fade In",
    slideUp: "Slide Up",
    slideDown: "Slide Down",
    scaleIn: "Scale In",
    noAnimation: "No Animation",

    // Actions
    exportCSS: "📋 Export CSS",
    copiedToClipboard: "✅ Copied to Clipboard!",

    // Preview
    livePreview: "Live Preview",
    loadingFonts: "🔄 Loading Google Fonts for preview...",
    transcriptSample: "This is the transcript line",
    japaneseSample: "これは日本語の翻訳です",
    koreanSample: "이것은 한국어 번역입니다",

    // Instructions
    instructions: "Instructions",
    instruction1: "Customize your settings using the controls on the left",
    instruction2: "Preview your changes in the black preview area above",
    instruction3: "When satisfied, click \"Export CSS\" to copy the code",
    instruction4: "In OBS, add a Browser Source with your export URL",
    instruction5: "Paste the CSS code into the \"Custom CSS\" field",
    instruction6: "Your captions will now use your custom styling!",

    // Presets
    stylePresets: "Style Presets",
    presetDefault: "Default",
    presetSophisticated: "Sophisticated",
    presetWhimsy: "Whimsy",
    presetCustom: "Custom",
    presetDefaultDesc: "Clean and simple with a blue glow",
    presetSophisticatedDesc: "Elegant serif fonts with warm tones",
    presetWhimsyDesc: "Fun and playful with pink accents",
    presetCustomDesc: "Create your own unique style",

    // Help Section - CSS Documentation
    howToMakeOwnCSS: "CSS Concepts Guide",
    helpIntro: "Understand the three layers of CATT CSS to create your perfect custom style.",

    // CSS Class Reference
    helpCSSReferenceTitle: "Style Concepts",
    helpGlobalTitle: "1. Global Styles (Color, Border, Glow)",
    helpGlobalDesc: "Properties like 'color', 'border', and 'glow' that you want to apply to ALL text regardless of language or type.",
    helpLanguageTitle: "2. Language Styles (Specific Fonts)",
    helpLanguageDesc: "Target specific languages (e.g., .translation-ja) to change fonts specifically for Japanese or Korean characters.",
    helpRoleTitle: "3. Role Styles (Transcription vs. Translation)",
    helpRoleDesc: "Define differences between Transcripts (immediate) and Translations (animated). This controls how text appears.",
    helpAnimationsTitle: "4. Custom Keyframes",
    helpAnimationsDesc: "The actual logic for your animations. Define exactly how the entry effects should behave.",

    // Tips
    helpTipsTitle: "Tips",
    helpTip1: "Use !important on properties to ensure your styles override the defaults",
    helpTip2: "The source language won't appear in translations (e.g., if speaking Japanese, .translation-ja won't be used)",
    helpTip3: "Test with long sentences to ensure text doesn't overflow your OBS scene",

    // Categories
    system: "System",
    sansSerif: "Sans-Serif",
    serif: "Serif",
    handwritten: "Handwritten",
    monospace: "Monospace",
    display: "Display",
    fallback: "Fallback"
  },

  ja: {
    // Navigation
    backToMain: "← メインアプリに戻る",
    cssCustomizer: "CSSカスタマイザー",
    customizeAppearance: "OBSキャプションの外観をカスタマイズ",

    // Font Settings
    fontSettings: "フォント設定",
    transcriptFont: "転写フォント",
    englishTextFont: "英語テキストフォント",
    japaneseTextFont: "日本語テキストフォント",
    koreanTextFont: "韓国語テキストフォント",
    searchFonts: "フォントを検索...",
    selectFont: "フォントを選択",
    close: "閉じる",
    noFontsFound: "一致するフォントが見つかりません",

    // Appearance
    appearance: "外観",
    textColor: "テキストカラー",
    enableGlow: "グローを有効化",
    glowColor: "グローカラー",
    glowIntensity: "グロー強度",
    enableBorder: "ボーダーを有効化",
    borderColor: "ボーダーカラー",
    borderWidth: "ボーダー幅",
    enableShadow: "シャドウを有効化",
    shadowColor: "シャドウカラー",
    spacing: "間隔",
    tight: "狭い",
    normal: "普通",
    loose: "広い",

    // Font Sizes
    fontSizes: "フォントサイズ",
    transcriptSize: "転写サイズ",
    translationSize: "翻訳サイズ",

    // Animation Stagger
    enableStagger: "スタガー表示 (行をずらす)",
    staggerTime: "表示の遅延時間",

    // Animation
    animationTranslationsOnly: "アニメーション（翻訳のみ）",
    animationType: "アニメーションタイプ",
    animationSpeed: "アニメーション速度",
    fadeIn: "フェードイン",
    slideUp: "スライドアップ",
    slideDown: "スライドダウン",
    scaleIn: "スケールイン",
    noAnimation: "アニメーションなし",

    // Actions
    exportCSS: "📋 CSSをエクスポート",
    copiedToClipboard: "✅ クリップボードにコピーしました！",

    // Preview
    livePreview: "ライブプレビュー",
    loadingFonts: "🔄 プレビュー用のGoogleフォントを読み込み中...",
    transcriptSample: "これは転写行です",
    japaneseSample: "これは日本語の翻訳です",
    koreanSample: "이것은 한국어 번역입니다",

    // Instructions
    instructions: "使用方法",
    instruction1: "左側のコントロールを使用して設定をカスタマイズ",
    instruction2: "上の黒いプレビューエリアで変更を確認",
    instruction3: "満足したら「CSSをエクスポート」をクリックしてコードをコピー",
    instruction4: "OBSで、エクスポートURLを使用してブラウザソースを追加",
    instruction5: "\"カスタムCSS\"フィールドにCSSコードを貼り付け",
    instruction6: "キャプションがカスタムスタイルを使用するようになります！",

    // Presets
    stylePresets: "スタイルプリセット",
    presetDefault: "デフォルト",
    presetSophisticated: "洗練",
    presetWhimsy: "遊び心",
    presetCustom: "カスタム",
    presetDefaultDesc: "青いグローでシンプル",
    presetSophisticatedDesc: "暖色系のエレガントなセリフ体",
    presetWhimsyDesc: "ピンクのアクセントで楽しく遊び心のある",
    presetCustomDesc: "独自のスタイルを作成",

    // Help Section - CSS Documentation
    howToMakeOwnCSS: "CSSコンセプトガイド",
    helpIntro: "CATTのCSSにある3つのレイヤーを理解して、完璧なカスタムスタイルを作成しましょう。",

    // CSS Class Reference
    helpCSSReferenceTitle: "スタイルのコンセプト",
    helpGlobalTitle: "1. グローバルスタイル (色、ボーダー、グロー)",
    helpGlobalDesc: "「色」「ボーダー」「グロー」など、言語や種類に関わらず全てのテキストに適用したい共通の設定です。",
    helpLanguageTitle: "2. 言語スタイル (特定のフォント)",
    helpLanguageDesc: "特定の言語（.translation-jaなど）を対象にして、日本語や韓国語のフォントを個別に変更します。",
    helpRoleTitle: "3. 役割別スタイル (転写 vs 翻訳)",
    helpRoleDesc: "「転写」（即時表示）と「翻訳」（アニメーション表示）の違いを定義し、出現の仕方を制御します。",
    helpAnimationsTitle: "4. カスタム・キーフレーム",
    helpAnimationsDesc: "アニメーションの実際の動作（フェード、スライドなど）を定義するロジック部分です。",

    // Tips
    helpTipsTitle: "ヒント",
    helpTip1: "!importantを使用してスタイルがデフォルトを確実に上書きするようにする",
    helpTip2: "ソース言語は翻訳に表示されない（例：日本語で話す場合、.translation-jaは使用されない）",
    helpTip3: "長い文でテストしてOBSシーンからテキストがはみ出さないことを確認",

    // Categories
    system: "システム",
    sansSerif: "サンセリフ",
    serif: "セリフ",
    handwritten: "手書き",
    monospace: "等幅",
    display: "ディスプレイ",
    fallback: "フォールバック"
  },

  ko: {
    // Navigation
    backToMain: "← 메인 앱으로 돌아가기",
    cssCustomizer: "CSS 사용자 지정",
    customizeAppearance: "OBS 캡션의 모양을 사용자 지정하세요",

    // Font Settings
    fontSettings: "글꼴 설정",
    transcriptFont: "전사 글꼴",
    englishTextFont: "영어 텍스트 글꼴",
    japaneseTextFont: "일본어 텍스트 글꼴",
    koreanTextFont: "한국어 텍스트 글꼴",
    searchFonts: "글꼴 검색...",
    selectFont: "글꼴 선택",
    close: "닫기",
    noFontsFound: "일치하는 글꼴을 찾을 수 없습니다",

    // Appearance
    appearance: "모양",
    textColor: "텍스트 색상",
    enableGlow: "글로우 활성화",
    glowColor: "글로우 색상",
    glowIntensity: "글로우 강도",
    enableBorder: "테두리 활성화",
    borderColor: "테두리 색상",
    borderWidth: "테두리 두께",
    enableShadow: "그림자 활성화",
    shadowColor: "그림자 색상",
    spacing: "간격",
    tight: "좁게",
    normal: "보통",
    loose: "넓게",

    // Font Sizes
    fontSizes: "글꼴 크기",
    transcriptSize: "전사 크기",
    translationSize: "번역 크기",

    // Animation Stagger
    enableStagger: "지연 표시 (줄 간격 지연)",
    staggerTime: "표시 지연 시간",

    // Animation
    animationTranslationsOnly: "애니메이션 (번역만)",
    animationType: "애니메이션 유형",
    animationSpeed: "애니메이션 속도",
    fadeIn: "페이드 인",
    slideUp: "슬라이드 업",
    slideDown: "슬라이드 다운",
    scaleIn: "스케일 인",
    noAnimation: "애니메이션 없음",

    // Actions
    exportCSS: "📋 CSS 내보내기",
    copiedToClipboard: "✅ 클립보드에 복사됨!",

    // Preview
    livePreview: "라이브 미리보기",
    loadingFonts: "🔄 미리보기용 Google 글꼴 로딩 중...",
    transcriptSample: "이것은 전사 라인입니다",
    japaneseSample: "これは日本語の翻訳です",
    koreanSample: "이것은 한국어 번역입니다",

    // Instructions
    instructions: "사용법",
    instruction1: "왼쪽 컨트롤을 사용하여 설정을 사용자 지정하세요",
    instruction2: "위의 검은색 미리보기 영역에서 변경사항을 확인하세요",
    instruction3: "만족하면 \"CSS 내보내기\"를 클릭하여 코드를 복사하세요",
    instruction4: "OBS에서 내보내기 URL로 브라우저 소스를 추가하세요",
    instruction5: "\"사용자 지정 CSS\" 필드에 CSS 코드를 붙여넣으세요",
    instruction6: "이제 캡션이 사용자 지정 스타일을 사용합니다!",

    // Presets
    stylePresets: "스타일 프리셋",
    presetDefault: "기본",
    presetSophisticated: "세련된",
    presetWhimsy: "재미있는",
    presetCustom: "사용자 지정",
    presetDefaultDesc: "파란색 글로우로 깔끔하고 심플하게",
    presetSophisticatedDesc: "따뜻한 색조의 우아한 세리프 글꼴",
    presetWhimsyDesc: "핑크 악센트로 재미있고 장난스럽게",
    presetCustomDesc: "나만의 스타일 만들기",

    // Help Section - CSS Documentation
    howToMakeOwnCSS: "CSS 컨셉 가이드",
    helpIntro: "CATT CSS의 세 가지 레이어를 이해하여 완벽한 사용자 정의 스타일을 만들어보세요.",

    // CSS Class Reference
    helpCSSReferenceTitle: "스타일 컨셉",
    helpGlobalTitle: "1. 글로벌 스타일 (색상, 테두리, 글로우)",
    helpGlobalDesc: "언어나 유형에 관계없이 모든 텍스트에 적용하려는 '색상', '테두리', '글로우'와 같은 공통 속성입니다.",
    helpLanguageTitle: "2. 언어 스타일 (특정 글꼴)",
    helpLanguageDesc: "특정 언어(.translation-ja 등)를 대상으로 일본어 나 한국어 글꼴을 개별적으로 변경합니다.",
    helpRoleTitle: "3. 역할 스타일 (전사 vs 번역)",
    helpRoleDesc: "전사(즉시 표시)와 번역(애니메이션 표시)의 차이를 정의하고 텍스트가 나타나는 방식을 제어합니다.",
    helpAnimationsTitle: "4. 사용자 정의 키프레임",
    helpAnimationsDesc: "애니메이션의 실제 작동 방식(페이드, 슬라이드 등)을 정의하는 로직 부분입니다.",

    // Tips
    helpTipsTitle: "팁",
    helpTip1: "!important를 사용하여 스타일이 기본값을 확실히 재정의하도록 함",
    helpTip2: "소스 언어는 번역에 표시되지 않음 (예: 일본어로 말하면 .translation-ja는 사용되지 않음)",
    helpTip3: "긴 문장으로 테스트하여 텍스트가 OBS 장면에서 넘치지 않는지 확인",

    // Categories
    system: "시스템",
    sansSerif: "산세리프",
    serif: "세리프",
    handwritten: "손글씨",
    monospace: "고정폭",
    display: "디스플레이",
    fallback: "대체"
  }
};

const CSSCustomizer: React.FC = () => {
  const [settings, setSettings] = useState<CustomizationSettings>(DEFAULT_SETTINGS);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [fontLoadTrigger, setFontLoadTrigger] = useState(0); // Force re-render for font changes
  const [fontsLoaded, setFontsLoaded] = useState(false);
  // Preset state
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('default');
  // Help section collapse state
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);
  // Hover highlight state for CSS guide
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<'hidden' | 'visible'>('hidden');
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Detect language from localStorage or default to English
    return localStorage.getItem('language') || 'en';
  });

  // Get source language from URL params or localStorage
  const [sourceLanguage, setSourceLanguage] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // First try to get from URL parameters (most reliable)
    const urlSource = urlParams.get('source');
    if (urlSource) {
      console.log('[CSS Customizer] Got source language from URL:', urlSource);
      return urlSource;
    }

    // Fallback: try sessionStorage (for backward compatibility)
    const sessionId = urlParams.get('session');
    if (sessionId) {
      const storedSourceLang = sessionStorage.getItem(`sourceLanguage_${sessionId}`);
      if (storedSourceLang) {
        console.log('[CSS Customizer] Got source language from sessionStorage:', storedSourceLang);
        return storedSourceLang;
      }
    }

    console.log('[CSS Customizer] Defaulting to English');
    return 'en'; // Default to English
  });

  // Add a trigger for source language changes
  useEffect(() => {
    // Force preview re-render when source language changes
    setFontLoadTrigger(prev => prev + 1);
  }, [sourceLanguage]);

  // New: Animation system using CSS transitions
  const triggerAnimation = useCallback(() => {
    // Reset to hidden state first
    setAnimationState('hidden');
    setAnimationTrigger(prev => prev + 1);

    // After a brief moment, show with animation
    setTimeout(() => {
      setAnimationState('visible');
    }, 50); // Small delay to ensure reset is visible
  }, []);

  // New: Handle animation timing
  useEffect(() => {
    // Trigger animation when settings change
    triggerAnimation();

    // Set up 3-second interval for animation replay
    const interval = setInterval(() => {
      triggerAnimation();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [settings, sourceLanguage, triggerAnimation]);

  // Listen for language changes from localStorage (set by main app)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'language' && e.newValue) {
        setCurrentLanguage(e.newValue);
      }
    };

    // Also check for programmatic localStorage changes (not just cross-tab)
    const checkLanguageChange = () => {
      const currentStoredLanguage = localStorage.getItem('language') || 'en';
      if (currentStoredLanguage !== currentLanguage) {
        setCurrentLanguage(currentStoredLanguage);
      }
    };

    // Check for source language changes in sessionStorage
    const checkSourceLanguageChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session');
      if (sessionId) {
        const storedSourceLang = sessionStorage.getItem(`sourceLanguage_${sessionId}`);
        console.log('[CSS Customizer] Session ID:', sessionId);
        console.log('[CSS Customizer] Stored source language:', storedSourceLang);
        console.log('[CSS Customizer] Current source language:', sourceLanguage);
        if (storedSourceLang && storedSourceLang !== sourceLanguage) {
          console.log('[CSS Customizer] Updating source language from', sourceLanguage, 'to', storedSourceLang);
          setSourceLanguage(storedSourceLang);
        }
      }
    };

    // Listen for storage events (cross-tab changes)
    window.addEventListener('storage', handleStorageChange);

    // Check periodically for programmatic changes within the same tab
    const interval = setInterval(() => {
      checkLanguageChange();
      checkSourceLanguageChange();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentLanguage, sourceLanguage]);

  // Get current translations
  const t = translations[currentLanguage] || translations.en;

  // Helper functions to get language configuration based on source language
  const getLanguageConfig = () => {
    const allLanguages = ['en', 'ja', 'ko'];
    const translationLanguages = allLanguages.filter(lang => lang !== sourceLanguage);

    return {
      sourceLanguage,
      translationLanguages,
      sourceFontLabel: getSourceFontLabel(),
      translationFontLabels: getTranslationFontLabels(translationLanguages)
    };
  };

  const getSourceFontLabel = () => {
    switch (sourceLanguage) {
      case 'ja': return t.japaneseTextFont;
      case 'ko': return t.koreanTextFont;
      default: return t.transcriptFont; // English or default
    }
  };

  const getTranslationFontLabels = (translationLanguages: string[]) => {
    return translationLanguages.map(lang => {
      switch (lang) {
        case 'ja': return { code: 'ja', label: t.japaneseTextFont };
        case 'ko': return { code: 'ko', label: t.koreanTextFont };
        default: return { code: 'en', label: t.englishTextFont };
      }
    });
  };

  const getPreviewSamples = () => {
    const config = getLanguageConfig();

    // Define proper sample texts for each language as source vs translation
    // Use hardcoded text that doesn't depend on UI language
    const transcriptSamples = {
      en: "This is the transcript line", // Fixed English text
      ja: "これは転写行です", // "This is the transcript line" in Japanese
      ko: "이것은 전사 라인입니다" // "This is the transcript line" in Korean
    };

    const translationSamples = {
      en: "This is English translation",
      ja: "これは日本語の翻訳です", // "This is Japanese translation" 
      ko: "이것은 한국어 번역입니다" // "This is Korean translation"
    };

    const result = {
      source: transcriptSamples[sourceLanguage as keyof typeof transcriptSamples] || transcriptSamples.en,
      translations: config.translationLanguages.map(lang => ({
        code: lang,
        text: translationSamples[lang as keyof typeof translationSamples]
      }))
    };

    console.log('[CSS Customizer] Preview samples:', {
      sourceLanguage,
      result
    });

    return result;
  };

  // Handle preset selection
  const handlePresetChange = useCallback((preset: PresetType) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      // Reset to default settings when selecting custom
      setSettings(DEFAULT_SETTINGS);
      setFontLoadTrigger(prev => prev + 1);
    } else {
      setSettings(PRESETS[preset]);
      setFontLoadTrigger(prev => prev + 1);
    }
  }, []);

  // Load Google Fonts dynamically for preview
  useEffect(() => {
    const googleFontsUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;500;700&family=Lato:wght@400;500;700&family=Source+Sans+Pro:wght@400;500;700&family=Poppins:wght@400;500;700&family=Montserrat:wght@400;500;700&family=Nunito:wght@400;500;700&family=Raleway:wght@400;500;700&family=Ubuntu:wght@400;500;700&family=Fira+Sans:wght@400;500;700&family=Work+Sans:wght@400;500;700&family=PT+Sans:wght@400;500;700&family=Noto+Sans:wght@400;500;700&family=Quicksand:wght@400;500;700&family=Rubik:wght@400;500;700&family=DM+Sans:wght@400;500;700&family=Manrope:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;700&family=Outfit:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&family=Lexend:wght@400;500;700&family=Archivo:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;700&family=Red+Hat+Display:wght@400;500;700&family=Libre+Franklin:wght@400;500;700&family=Barlow:wght@400;500;700&family=Karla:wght@400;500;700&family=Playfair+Display:wght@400;500;700&family=Merriweather:wght@400;500;700&family=Lora:wght@400;500;700&family=Source+Serif+Pro:wght@400;500;700&family=Crimson+Text:wght@400;500;700&family=PT+Serif:wght@400;500;700&family=Libre+Baskerville:wght@400;500;700&family=Cormorant+Garamond:wght@400;500;700&family=EB+Garamond:wght@400;500;700&family=Noto+Serif:wght@400;500;700&family=Vollkorn:wght@400;500;700&family=Alegreya:wght@400;500;700&family=Spectral:wght@400;500;700&family=IBM+Plex+Serif:wght@400;500;700&family=Arvo:wght@400;500;700&family=Rokkitt:wght@400;500;700&family=Old+Standard+TT:wght@400;500;700&family=Bitter:wght@400;500;700&family=Zilla+Slab:wght@400;500;700&family=Cardo:wght@400;500;700&family=Dancing+Script:wght@400;500;700&family=Pacifico&family=Caveat:wght@400;500;700&family=Kalam:wght@400;500;700&family=Indie+Flower&family=Permanent+Marker&family=Shadows+Into+Light&family=Amatic+SC:wght@400;500;700&family=Satisfy&family=Handlee&family=Courgette&family=Kaushan+Script&family=Great+Vibes&family=Lobster&family=Righteous&family=JetBrains+Mono:wght@400;500;700&family=Fira+Code:wght@400;500;700&family=Source+Code+Pro:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;700&family=Roboto+Mono:wght@400;500;700&family=Space+Mono:wght@400;500;700&family=Inconsolata:wght@400;500;700&family=Ubuntu+Mono:wght@400;500;700&family=Oswald:wght@400;500;700&family=Bebas+Neue&family=Anton&family=Fjalla+One&family=Russo+One&family=Comfortaa:wght@400;500;700&family=Fredoka+One&family=Bangers&family=Alfa+Slab+One&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;700&family=M+PLUS+Rounded+1c:wght@400;500;700&family=M+PLUS+1p:wght@400;500;700&family=Sawarabi+Gothic&family=Sawarabi+Mincho&family=Kosugi&family=Kosugi+Maru&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Kaku+Gothic+Antique:wght@400;500;700&family=Zen+Old+Mincho:wght@400;500;700&family=Kiwi+Maru:wght@400;500;700&family=Shippori+Mincho:wght@400;500;700&family=BIZ+UDGothic:wght@400;500;700&family=BIZ+UDMincho:wght@400;500;700&family=Kaisei+Opti:wght@400;500;700&family=Kaisei+HarunoUmi:wght@400;500;700&family=Yomogi&family=Klee+One:wght@400;500;700&family=Reggae+One&family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;500;700&family=IBM+Plex+Sans+KR:wght@400;500;700&family=Nanum+Gothic:wght@400;500;700&family=Nanum+Myeongjo:wght@400;500;700&family=Nanum+Gothic+Coding:wght@400;500;700&family=Do+Hyeon&family=Jua&family=Gamja+Flower&family=Gugi&family=Single+Day&family=Cute+Font&family=Gaegu:wght@400;500;700&family=Poor+Story&family=Stylish&family=East+Sea+Dokdo&family=Hi+Melody&family=Sunflower:wght@400;500;700&display=swap';

    // Check if the Google Fonts link already exists
    const existingLink = document.querySelector('link[href*="fonts.googleapis.com"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = googleFontsUrl;
      document.head.appendChild(link);

      // Wait for fonts to load then trigger re-render
      link.onload = () => {
        console.log('Google Fonts loaded successfully');
        setFontsLoaded(true);
        setTimeout(() => setFontLoadTrigger(prev => prev + 1), 500);
      };

      link.onerror = () => {
        console.error('Failed to load Google Fonts');
        setFontsLoaded(true); // Set to true anyway to show fallback fonts
      };
    } else {
      setFontsLoaded(true);
    }

    // Cleanup function to remove the link when component unmounts
    return () => {
      const link = document.querySelector('link[href*="fonts.googleapis.com"]');
      if (link && link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, []);

  const updateSetting = useCallback((key: keyof CustomizationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Switch to custom preset when user manually changes settings
    setSelectedPreset('custom');

    // Force a re-render when fonts change to ensure preview updates
    if (key.includes('Font')) {
      setTimeout(() => {
        setFontLoadTrigger(prev => prev + 1);
      }, 200); // Increased delay to allow font loading
    }
  }, []);

  // Load fonts dynamically when they're selected
  const loadFont = useCallback((fontFamily: string) => {
    // Since all fonts are now loaded upfront, just trigger a re-render
    setTimeout(() => {
      setFontLoadTrigger(prev => prev + 1);
    }, 100);
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
        return { transcriptMargin: '0.25rem', translationMargin: '0.25rem 0' };
      case 'loose':
        return { transcriptMargin: '1rem', translationMargin: '1rem 0' };
      default:
        return { transcriptMargin: '0.5rem', translationMargin: '0.5rem 0' };
    }
  };

  // New: Generate transition-based animation styles
  const getTransitionStyles = (isVisible: boolean, animationType: string, animationSpeed: number, index: number) => {
    const baseTransition = `all ${animationSpeed}s ease-out`;

    // Calculate delay based on user's stagger settings
    // index 0 (first translation) starts at 0 delay
    const delay = settings.staggerEnabled ? index * settings.staggerTime : 0;
    const transitionWithDelay = delay > 0 ? `all ${animationSpeed}s ease-out ${delay}s` : baseTransition;

    if (!isVisible) {
      // Hidden state - different starting points for each animation type
      switch (animationType) {
        case 'slideUp':
          return {
            opacity: 0,
            transform: 'translateY(30px)',
            transition: transitionWithDelay
          };
        case 'slideDown':
          return {
            opacity: 0,
            transform: 'translateY(-30px)',
            transition: transitionWithDelay
          };
        case 'scaleIn':
          return {
            opacity: 0,
            transform: 'scale(0.8)',
            transition: transitionWithDelay
          };
        case 'none':
          return {
            opacity: 1,
            transform: 'none',
            transition: 'none'
          };
        default: // fadeIn
          return {
            opacity: 0,
            filter: 'blur(1px)',
            transition: transitionWithDelay
          };
      }
    } else {
      // Visible state - all animations end at the same place
      return {
        opacity: 1,
        transform: 'none',
        filter: 'none',
        transition: transitionWithDelay
      };
    }
  };

  const generateAnimationKeyframes = () => {
    const intensity = (settings.glowIntensity / 100) * 1.25; // Scale so 100% = old 125%
    const mainColor = hexToRgba(settings.glowColor, Math.min(0.8 * intensity, 1));
    const midColor = hexToRgba(settings.glowColor, Math.min(0.6 * intensity, 1));
    const outerColor = hexToRgba(settings.glowColor, Math.min(0.4 * intensity, 1));

    switch (settings.animationType) {
      case 'slideUp':
        return `
@keyframes slideUpGlow {
  0% {
    opacity: 0;
    transform: translateY(30px);
    text-shadow: 0 0 5px ${hexToRgba(settings.glowColor, Math.min(0.3 * intensity, 1))};
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    text-shadow: 0 0 ${Math.min(10 * intensity, 32)}px ${mainColor}, 0 0 ${Math.min(20 * intensity, 50)}px ${midColor}, 0 0 ${Math.min(28 * intensity, 65)}px ${outerColor};
  }
}`;

      case 'slideDown':
        return `
@keyframes slideDownGlow {
  0% {
    opacity: 0;
    transform: translateY(-30px);
    text-shadow: 0 0 5px ${hexToRgba(settings.glowColor, Math.min(0.3 * intensity, 1))};
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    text-shadow: 0 0 ${Math.min(10 * intensity, 32)}px ${mainColor}, 0 0 ${Math.min(20 * intensity, 50)}px ${midColor}, 0 0 ${Math.min(28 * intensity, 65)}px ${outerColor};
  }
}`;

      case 'scaleIn':
        return `
@keyframes scaleInGlow {
  0% {
    opacity: 0;
    transform: scale(0.8);
    text-shadow: 0 0 5px ${hexToRgba(settings.glowColor, Math.min(0.3 * intensity, 1))};
  }
  100% {
    opacity: 1;
    transform: scale(1);
    text-shadow: 0 0 ${Math.min(10 * intensity, 32)}px ${mainColor}, 0 0 ${Math.min(20 * intensity, 50)}px ${midColor}, 0 0 ${Math.min(28 * intensity, 65)}px ${outerColor};
  }
}`;

      case 'none':
        return `
@keyframes noAnimation {
  0%, 100% {
    opacity: 1;
    text-shadow: 0 0 ${Math.min(10 * intensity, 32)}px ${mainColor}, 0 0 ${Math.min(20 * intensity, 50)}px ${midColor}, 0 0 ${Math.min(28 * intensity, 65)}px ${outerColor};
  }
}`;

      default: // fadeIn
        return `
@keyframes fadeInGlow {
  0% {
    opacity: 0;
    filter: blur(1px);
    text-shadow: 0 0 4px ${hexToRgba(settings.glowColor, Math.min(0.3 * intensity, 1))};
  }
  50% {
    opacity: 0.8;
    filter: blur(0.5px);
    text-shadow: 0 0 ${Math.min(8 * intensity, 30)}px ${hexToRgba(settings.glowColor, Math.min(0.5 * intensity, 1))};
  }
  100% {
    opacity: 1;
    filter: blur(0);
    text-shadow: 0 0 ${Math.min(10 * intensity, 32)}px ${mainColor}, 0 0 ${Math.min(20 * intensity, 50)}px ${midColor}, 0 0 ${Math.min(28 * intensity, 65)}px ${outerColor};
  }
}`;
    }
  };

  const generateCSS = () => {
    const { transcriptMargin, translationMargin } = generateSpacingValues();
    const intensity = (settings.glowIntensity / 100) * 1.25; // Scale so 100% = old 125%

    const textShadows = [];
    if (settings.glowEnabled && settings.glowIntensity > 0) {
      textShadows.push(`0 0 ${Math.min(10 * intensity, 32)}px ${hexToRgba(settings.glowColor, Math.min(0.8 * intensity, 1))}`);
      textShadows.push(`0 0 ${Math.min(20 * intensity, 50)}px ${hexToRgba(settings.glowColor, Math.min(0.6 * intensity, 1))}`);
      textShadows.push(`0 0 ${Math.min(28 * intensity, 65)}px ${hexToRgba(settings.glowColor, Math.min(0.4 * intensity, 1))}`);
    }
    if (settings.shadowEnabled) {
      textShadows.push(`2px 2px 4px ${hexToRgba(settings.shadowColor || '#000000', 0.8)}`);
    }

    const glowStyle = textShadows.length > 0
      ? `text-shadow: ${textShadows.join(', ')} !important;`
      : 'text-shadow: none !important;';

    const borderStyle = settings.borderEnabled
      ? `-webkit-text-stroke: ${settings.borderWidth}px ${settings.borderColor} !important;`
      : '-webkit-text-stroke: 0 !important;';

    const animationName = settings.animationType === 'slideUp' ? 'slideUpGlow' :
      settings.animationType === 'slideDown' ? 'slideDownGlow' :
        settings.animationType === 'scaleIn' ? 'scaleInGlow' :
          settings.animationType === 'none' ? 'noAnimation' : 'fadeInGlow';

    // Helper to extract font name from font-family value (e.g., "'Inter', sans-serif" -> "Inter")
    const extractFontName = (fontValue: string): string | null => {
      // Skip system fonts
      if (fontValue.includes('system-ui') || fontValue.includes('-apple-system')) {
        return null;
      }
      // Extract the font name from quotes
      const match = fontValue.match(/'([^']+)'/);
      return match ? match[1] : null;
    };

    // Build dynamic Google Fonts import with only selected fonts
    const selectedFonts = new Set<string>();
    [settings.transcriptFont, settings.japaneseFont, settings.koreanFont].forEach(font => {
      const fontName = extractFontName(font);
      if (fontName) {
        selectedFonts.add(fontName);
      }
    });

    // Build the Google Fonts URL
    let fontImport = '';
    if (selectedFonts.size > 0) {
      const fontParams = Array.from(selectedFonts)
        .map(font => `family=${font.replace(/ /g, '+')}:wght@400;500;700`)
        .join('&');
      fontImport = `@import url('https://fonts.googleapis.com/css2?${fontParams}&display=swap');`;
    }

    return `${fontImport}
.transcript-line {
  font-size: ${settings.transcriptSize}rem !important;
  font-weight: 600 !important;
  color: ${settings.textColor} !important;
  text-align: center !important;
  margin: 0 0 ${transcriptMargin} 0 !important;
  line-height: 1.3 !important;
  ${glowStyle}
  ${borderStyle}
  paint-order: stroke fill !important;
  animation: none !important;
  transition: none !important;
  opacity: 1 !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  position: relative !important;
}

.translation-line {
  font-size: ${settings.translationSize}rem !important;
  font-weight: 500 !important;
  color: ${settings.textColor} !important;
  text-align: center !important;
  margin: ${translationMargin} !important;
  line-height: 1.3 !important;
  ${glowStyle}
  ${borderStyle}
  paint-order: stroke fill !important;
  animation: ${animationName} ${settings.animationSpeed}s ease-out forwards !important;
  opacity: 0;
  transform: translateY(5px);
  overflow: visible !important;
  position: relative !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

.lang-en, .transcript-en, .translation-en {
  font-family: ${settings.transcriptFont} !important;
}

.lang-ja, .transcript-ja, .translation-ja {
  font-family: ${settings.japaneseFont} !important;
}

.lang-ko, .transcript-ko, .translation-ko {
  font-family: ${settings.koreanFont} !important;
}

.lang-unknown, .transcript-unknown, .translation-unknown {
  font-family: ${settings.transcriptFont} !important;
}

${settings.staggerEnabled ? `
.translation-line:nth-child(3) {
  animation-delay: ${settings.staggerTime}s !important;
}
.translation-line:nth-child(4) {
  animation-delay: ${settings.staggerTime * 2}s !important;
}
.translation-line:nth-child(5) {
  animation-delay: ${settings.staggerTime * 3}s !important;
}
` : ''}

${generateAnimationKeyframes()}

.animate-update .translation-line {
  animation-duration: ${settings.animationSpeed}s !important;
  animation-fill-mode: forwards !important;
  animation-timing-function: ease-out !important;
}

.transcript-line.sliding-text {
  opacity: 1 !important;
  overflow-x: visible !important;
  overflow-y: visible !important;
  position: absolute !important;
}

.export-view {
  position: relative !important;
  z-index: 1000 !important;
}

.sliding-window-container {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
}

.sliding-window-container.punctuation-enabled {
}

.translation-line {
  will-change: opacity, transform !important;
  backface-visibility: hidden !important;
}

.export-view .translation-line {
  overflow: visible !important;
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

  // Helper function to ensure proper font family formatting
  const formatFontFamily = (fontFamily: string) => {
    // Add fallbacks for better font rendering
    if (fontFamily.includes('serif') && !fontFamily.includes('sans-serif')) {
      return `${fontFamily}, serif`;
    } else if (fontFamily.includes('monospace')) {
      return `${fontFamily}, monospace`;
    } else if (fontFamily.includes('cursive')) {
      return `${fontFamily}, cursive`;
    } else if (!fontFamily.includes('system-ui')) {
      return `${fontFamily}, sans-serif`;
    }
    return fontFamily;
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#efefef]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="text-[#efefef]/70 hover:text-[#efefef] mb-4 inline-block transition-colors">
            {t.backToMain}
          </Link>
          <h1 className="text-4xl font-bold mb-2">
            {t.cssCustomizer}
          </h1>
          <p className="text-[#606060]">
            {t.customizeAppearance}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Preset Selector */}
            <div className="bg-[#2d2d2d] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.stylePresets}
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {/* Default Preset */}
                <button
                  onClick={() => handlePresetChange('default')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${selectedPreset === 'default'
                    ? 'border-[#2196F3] bg-[#2196F3]/20'
                    : 'border-[#efefef]/30 hover:border-[#efefef]/50 bg-[#1e1e1e]'
                    }`}
                >
                  <div className="font-semibold text-[#efefef]">{t.presetDefault}</div>
                  <div className="text-sm text-[#efefef]/60 mt-1">{t.presetDefaultDesc}</div>
                </button>

                {/* Sophisticated Preset */}
                <button
                  onClick={() => handlePresetChange('sophisticated')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${selectedPreset === 'sophisticated'
                    ? 'border-[#8b7355] bg-[#8b7355]/20'
                    : 'border-[#efefef]/30 hover:border-[#efefef]/50 bg-[#1e1e1e]'
                    }`}
                >
                  <div className="font-semibold text-[#f0e6d3]">{t.presetSophisticated}</div>
                  <div className="text-sm text-[#efefef]/60 mt-1">{t.presetSophisticatedDesc}</div>
                </button>

                {/* Whimsy Preset */}
                <button
                  onClick={() => handlePresetChange('whimsy')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${selectedPreset === 'whimsy'
                    ? 'border-[#ff6b9d] bg-[#ff6b9d]/20'
                    : 'border-[#efefef]/30 hover:border-[#efefef]/50 bg-[#1e1e1e]'
                    }`}
                >
                  <div className="font-semibold text-[#fff5f8]">{t.presetWhimsy}</div>
                  <div className="text-sm text-[#efefef]/60 mt-1">{t.presetWhimsyDesc}</div>
                </button>

                {/* Custom Preset */}
                <button
                  onClick={() => handlePresetChange('custom')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${selectedPreset === 'custom'
                    ? 'border-[#efefef] bg-[#efefef]/20'
                    : 'border-[#efefef]/30 hover:border-[#efefef]/50 bg-[#1e1e1e]'
                    }`}
                >
                  <div className="font-semibold text-[#efefef]">{t.presetCustom}</div>
                  <div className="text-sm text-[#efefef]/60 mt-1">{t.presetCustomDesc}</div>
                </button>
              </div>
            </div>

            <div className="bg-[#2d2d2d] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.fontSettings}
              </h2>

              <div className="space-y-4">
                <div>
                  <FontSelector
                    fonts={sourceLanguage === 'ja' ? JAPANESE_FONTS : sourceLanguage === 'ko' ? KOREAN_FONTS : FONT_OPTIONS}
                    value={sourceLanguage === 'ja' ? settings.japaneseFont : sourceLanguage === 'ko' ? settings.koreanFont : settings.transcriptFont}
                    onChange={(value) => {
                      if (sourceLanguage === 'ja') {
                        updateSetting('japaneseFont', value);
                      } else if (sourceLanguage === 'ko') {
                        updateSetting('koreanFont', value);
                      } else {
                        updateSetting('transcriptFont', value);
                      }
                    }}
                    label={getLanguageConfig().sourceFontLabel}
                    onFontLoad={loadFont}
                    translations={t}
                  />
                </div>

                {getLanguageConfig().translationFontLabels.map((fontConfig, index) => (
                  <div key={fontConfig.code}>
                    <FontSelector
                      fonts={fontConfig.code === 'ja' ? JAPANESE_FONTS : fontConfig.code === 'ko' ? KOREAN_FONTS : FONT_OPTIONS}
                      value={fontConfig.code === 'ja' ? settings.japaneseFont : fontConfig.code === 'ko' ? settings.koreanFont : settings.transcriptFont}
                      onChange={(value) => {
                        if (fontConfig.code === 'ja') {
                          updateSetting('japaneseFont', value);
                        } else if (fontConfig.code === 'ko') {
                          updateSetting('koreanFont', value);
                        } else {
                          updateSetting('transcriptFont', value);
                        }
                      }}
                      label={fontConfig.label}
                      onFontLoad={loadFont}
                      translations={t}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#2d2d2d] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.appearance}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t.textColor}
                  </label>
                  <input
                    type="color"
                    className="w-full h-10 rounded-lg border border-[#efefef]/50 bg-[#606060]"
                    value={settings.textColor}
                    onChange={(e) => updateSetting('textColor', e.target.value)}
                  />
                </div>

                {/* Glow Settings */}
                <div className="pt-4 border-t border-[#efefef]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t.enableGlow}
                    </label>
                    <button
                      onClick={() => updateSetting('glowEnabled', !settings.glowEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.glowEnabled ? 'bg-[#2196F3]' : 'bg-[#606060]'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-[#efefef] transition-transform ${settings.glowEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {settings.glowEnabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t.glowColor}
                        </label>
                        <input
                          type="color"
                          className="w-full h-10 rounded-lg border border-[#efefef]/50 bg-[#606060]"
                          value={settings.glowColor}
                          onChange={(e) => updateSetting('glowColor', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t.glowIntensity}: {settings.glowIntensity}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          className="w-full"
                          style={{ accentColor: '#2196F3' }}
                          value={settings.glowIntensity}
                          onChange={(e) => updateSetting('glowIntensity', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Border Settings */}
                <div className="pt-4 border-t border-[#efefef]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t.enableBorder}
                    </label>
                    <button
                      onClick={() => updateSetting('borderEnabled', !settings.borderEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.borderEnabled ? 'bg-[#2196F3]' : 'bg-[#606060]'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-[#efefef] transition-transform ${settings.borderEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {settings.borderEnabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t.borderColor}
                        </label>
                        <input
                          type="color"
                          className="w-full h-10 rounded-lg border border-[#efefef]/50 bg-[#606060]"
                          value={settings.borderColor}
                          onChange={(e) => updateSetting('borderColor', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t.borderWidth}: {settings.borderWidth}px
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          className="w-full"
                          style={{ accentColor: '#2196F3' }}
                          value={settings.borderWidth}
                          onChange={(e) => updateSetting('borderWidth', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Shadow Settings */}
                <div className="pt-4 border-t border-[#efefef]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t.enableShadow}
                    </label>
                    <button
                      onClick={() => updateSetting('shadowEnabled', !settings.shadowEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.shadowEnabled ? 'bg-[#2196F3]' : 'bg-[#606060]'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-[#efefef] transition-transform ${settings.shadowEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {settings.shadowEnabled && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t.shadowColor}
                        </label>
                        <input
                          type="color"
                          className="w-full h-10 rounded-lg border border-[#efefef]/50 bg-[#606060]"
                          value={settings.shadowColor}
                          onChange={(e) => updateSetting('shadowColor', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#efefef]/10">
                  <label className="block text-sm font-medium mb-2">
                    {t.spacing}
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-[#606060] border border-[#efefef]/50 rounded-lg focus:ring-2 focus:ring-[#efefef]/50 text-[#efefef] hover:bg-[#707070] transition-colors"
                    value={settings.spacing}
                    onChange={(e) => updateSetting('spacing', e.target.value)}
                  >
                    <option value="tight">{t.tight}</option>
                    <option value="normal">{t.normal}</option>
                    <option value="loose">{t.loose}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#2d2d2d] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.fontSizes}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t.transcriptSize}: {settings.transcriptSize}rem
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    className="w-full"
                    style={{ accentColor: '#2196F3' }}
                    value={settings.transcriptSize}
                    onChange={(e) => updateSetting('transcriptSize', parseFloat(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t.translationSize}: {settings.translationSize}rem
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.1"
                    className="w-full"
                    style={{ accentColor: '#2196F3' }}
                    value={settings.translationSize}
                    onChange={(e) => updateSetting('translationSize', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#2d2d2d] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.animationTranslationsOnly}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t.animationType}
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-[#606060] border border-[#efefef]/50 rounded-lg focus:ring-2 focus:ring-[#efefef]/50 text-[#efefef] hover:bg-[#707070] transition-colors"
                    value={settings.animationType}
                    onChange={(e) => updateSetting('animationType', e.target.value)}
                  >
                    <option value="fadeIn">{t.fadeIn}</option>
                    <option value="slideUp">{t.slideUp}</option>
                    <option value="slideDown">{t.slideDown}</option>
                    <option value="scaleIn">{t.scaleIn}</option>
                    <option value="none">{t.noAnimation}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t.animationSpeed}: {settings.animationSpeed}s
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    className="w-full"
                    style={{ accentColor: '#2196F3' }}
                    value={settings.animationSpeed}
                    onChange={(e) => updateSetting('animationSpeed', parseFloat(e.target.value))}
                  />
                </div>

                {/* Stagger Settings */}
                <div className="pt-4 border-t border-[#efefef]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {t.enableStagger}
                    </label>
                    <button
                      onClick={() => updateSetting('staggerEnabled', !settings.staggerEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.staggerEnabled ? 'bg-[#2196F3]' : 'bg-[#606060]'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-[#efefef] transition-transform ${settings.staggerEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {settings.staggerEnabled && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t.staggerTime}: {settings.staggerTime}s
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="0.6"
                        step="0.05"
                        className="w-full"
                        style={{ accentColor: '#2196F3' }}
                        value={settings.staggerTime}
                        onChange={(e) => updateSetting('staggerTime', parseFloat(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={copyToClipboard}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${copiedToClipboard
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-[#606060] hover:bg-[#707070] text-[#efefef]'
                }`}
            >
              {copiedToClipboard ? t.copiedToClipboard : t.exportCSS}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <div className="bg-[#2d2d2d] rounded-lg p-6 sticky top-4" style={{ overflow: 'visible' }}>
              <h2 className="text-xl font-semibold mb-4">
                {t.livePreview}
              </h2>

              {!fontsLoaded && (
                <div className="bg-[#404040] border border-[#efefef]/30 rounded-lg p-3 mb-4">
                  <p className="text-[#efefef]/80 text-sm">
                    {t.loadingFonts}
                  </p>
                </div>
              )}

              <div className="bg-black rounded-lg p-8 min-h-[400px] flex flex-col justify-center space-y-4" style={{ overflow: 'visible' }}>
                <div
                  key={`transcript-${animationTrigger}`}
                  className="transcript-line"
                  style={{
                    fontFamily: formatFontFamily(
                      sourceLanguage === 'ja' ? settings.japaneseFont :
                        sourceLanguage === 'ko' ? settings.koreanFont :
                          settings.transcriptFont
                    ),
                    fontSize: `${settings.transcriptSize}rem`,
                    fontWeight: 600,
                    color: settings.textColor,
                    textAlign: 'center',
                    margin: `0 0 ${generateSpacingValues().transcriptMargin} 0`,
                    lineHeight: 1.3,
                    paddingBottom: '0.2rem',
                    WebkitTextStroke: settings.borderEnabled ? `${settings.borderWidth}px ${settings.borderColor}` : '0',
                    paintOrder: 'stroke fill',
                    textShadow: (() => {
                      const echoes = [];
                      const intensity = (settings.glowIntensity / 100) * 1.25;
                      if (settings.glowEnabled && settings.glowIntensity > 0) {
                        echoes.push(`0 0 ${Math.min(10 * intensity, 32)}px ${hexToRgba(settings.glowColor, Math.min(0.8 * intensity, 1))}`);
                        echoes.push(`0 0 ${Math.min(20 * intensity, 50)}px ${hexToRgba(settings.glowColor, Math.min(0.6 * intensity, 1))}`);
                        echoes.push(`0 0 ${Math.min(28 * intensity, 65)}px ${hexToRgba(settings.glowColor, Math.min(0.4 * intensity, 1))}`);
                      }
                      if (settings.shadowEnabled) {
                        echoes.push(`2px 2px 4px ${hexToRgba(settings.shadowColor || '#000000', 0.8)}`);
                      }
                      return echoes.length > 0 ? echoes.join(', ') : 'none';
                    })(),
                    overflowX: 'hidden',
                    overflowY: 'visible',
                    position: 'relative',
                  }}
                >
                  {getPreviewSamples().source}
                </div>

                {getPreviewSamples().translations.map((translation, index) => {
                  const transitionStyles = getTransitionStyles(
                    animationState === 'visible',
                    settings.animationType,
                    settings.animationSpeed,
                    index
                  );


                  return (
                    <div
                      key={`${translation.code}-${animationTrigger}`}
                      className={`translation-line translation-${translation.code}`}
                      style={{
                        fontFamily: formatFontFamily(
                          translation.code === 'ja' ? settings.japaneseFont :
                            translation.code === 'ko' ? settings.koreanFont :
                              settings.transcriptFont
                        ),
                        fontSize: `${settings.translationSize}rem`,
                        fontWeight: 500,
                        color: settings.textColor,
                        textAlign: 'center',
                        margin: generateSpacingValues().translationMargin,
                        lineHeight: 1.3,
                        WebkitTextStroke: settings.borderEnabled ? `${settings.borderWidth}px ${settings.borderColor}` : '0',
                        paintOrder: 'stroke fill',
                        textShadow: (() => {
                          const echoes = [];
                          const intensity = (settings.glowIntensity / 100) * 1.25;
                          if (settings.glowEnabled && settings.glowIntensity > 0) {
                            echoes.push(`0 0 ${Math.min(10 * intensity, 32)}px ${hexToRgba(settings.glowColor, Math.min(0.8 * intensity, 1))}`);
                            echoes.push(`0 0 ${Math.min(20 * intensity, 50)}px ${hexToRgba(settings.glowColor, Math.min(0.6 * intensity, 1))}`);
                            echoes.push(`0 0 ${Math.min(28 * intensity, 65)}px ${hexToRgba(settings.glowColor, Math.min(0.4 * intensity, 1))}`);
                          }
                          if (settings.shadowEnabled) {
                            echoes.push(`2px 2px 4px ${hexToRgba(settings.shadowColor || '#000000', 0.8)}`);
                          }
                          return echoes.length > 0 ? echoes.join(', ') : 'none';
                        })(),
                        overflow: 'visible',
                        position: 'relative',
                        // Apply transition-based animation styles
                        ...transitionStyles,
                      }}
                    >
                      {translation.text}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Instructions */}
            <div className="bg-[#2d2d2d] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.instructions}
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[#efefef]/70">
                <li>{t.instruction1}</li>
                <li>{t.instruction2}</li>
                <li>{t.instruction3}</li>
                <li>{t.instruction4}</li>
                <li>{t.instruction5}</li>
                <li>{t.instruction6}</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Collapsible How to Make Your Own CSS Section */}
        <div className="mt-8">
          <button
            onClick={() => setIsHelpExpanded(!isHelpExpanded)}
            className="w-full bg-[#2d2d2d] rounded-lg p-4 flex items-center justify-between hover:bg-[#3d3d3d] transition-colors"
          >
            <span className="text-lg font-semibold text-[#efefef]">
              {t.howToMakeOwnCSS}
            </span>
            <svg
              className={`w-6 h-6 text-[#efefef]/70 transform transition-transform ${isHelpExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isHelpExpanded && (
            <div className="bg-[#2d2d2d] rounded-b-lg border-t border-[#efefef]/10 p-6">
              <p className="text-[#efefef]/80 mb-6">
                {t.helpIntro}
              </p>

              {/* Two-column interactive layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side: Complete CSS Example */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[#efefef] mb-3">Complete Example</h3>
                  <div className="bg-[#0d0d0d] rounded-lg p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                    {/* Global Section */}
                    <div
                      className={`cursor-pointer transition-all duration-200 p-1 rounded ${hoveredSection === 'global' ? 'bg-[#2196F3]/20' : 'hover:bg-[#efefef]/5'}`}
                      onMouseEnter={() => setHoveredSection('global')}
                      onMouseLeave={() => setHoveredSection(null)}
                    >
                      <div className="text-[#6A9955]">/* 1. Global (Shared Styles) */</div>
                      <div className="text-[#4fc3f7]">.transcript-line, .translation-line {'{'}</div>
                      <div className="pl-4 text-[#efefef]/70">
                        <div><span className="text-[#9cdcfe]">color</span>: <span className="text-[#ce9178]">#ffffff</span> !important;</div>
                        <div><span className="text-[#9cdcfe]">-webkit-text-stroke</span>: <span className="text-[#b5cea8]">1px #000</span>;</div>
                        <div><span className="text-[#9cdcfe]">text-shadow</span>: <span className="text-[#b5cea8]">0 0 10px</span> rgba(...);</div>
                      </div>
                      <div className="text-[#4fc3f7]">{'}'}</div>
                    </div>

                    <div className="h-4" />

                    {/* Language Section */}
                    <div
                      className={`cursor-pointer transition-all duration-200 p-1 rounded ${hoveredSection === 'language' ? 'bg-[#2196F3]/20' : 'hover:bg-[#efefef]/5'}`}
                      onMouseEnter={() => setHoveredSection('language')}
                      onMouseLeave={() => setHoveredSection(null)}
                    >
                      <div className="text-[#6A9955]">/* 2. Language (Specific Fonts) */</div>
                      <div className="text-[#4fc3f7]">.translation-ja {'{'}</div>
                      <div className="pl-4 text-[#efefef]/70">
                        <div><span className="text-[#9cdcfe]">font-family</span>: <span className="text-[#6A9955]">'Noto Sans JP'</span>;</div>
                      </div>
                      <div className="text-[#4fc3f7]">{'}'}</div>
                    </div>

                    <div className="h-4" />

                    {/* Role Section */}
                    <div
                      className={`cursor-pointer transition-all duration-200 p-1 rounded ${hoveredSection === 'role' ? 'bg-[#2196F3]/20' : 'hover:bg-[#efefef]/5'}`}
                      onMouseEnter={() => setHoveredSection('role')}
                      onMouseLeave={() => setHoveredSection(null)}
                    >
                      <div className="text-[#6A9955]">/* 3. Role (Animations/Unique styles) */</div>
                      <div className="text-[#4fc3f7]">.translation-line {'{'}</div>
                      <div className="pl-4 text-[#efefef]/70">
                        <div><span className="text-[#9cdcfe]">animation</span>: <span className="text-[#dcdcaa]">fadeIn</span> <span className="text-[#b5cea8]">0.4s</span>;</div>
                      </div>
                      <div className="text-[#4fc3f7]">{'}'}</div>
                    </div>

                    <div className="h-4" />

                    {/* Animation Section */}
                    <div
                      className={`cursor-pointer transition-all duration-200 p-1 rounded ${hoveredSection === 'animation' ? 'bg-[#2196F3]/20' : 'hover:bg-[#efefef]/5'}`}
                      onMouseEnter={() => setHoveredSection('animation')}
                      onMouseLeave={() => setHoveredSection(null)}
                    >
                      <div><span className="text-[#c586c0]">@keyframes</span> <span className="text-[#dcdcaa]">fadeIn</span> {'{'}</div>
                      <div className="pl-4 text-[#efefef]/70">
                        <div>0% {'{'} <span className="text-[#9cdcfe]">opacity</span>: <span className="text-[#b5cea8]">0</span>; {'}'}</div>
                        <div>100% {'{'} <span className="text-[#9cdcfe]">opacity</span>: <span className="text-[#b5cea8]">1</span>; {'}'}</div>
                      </div>
                      <div className="text-[#c586c0]">{'}'}</div>
                    </div>
                  </div>
                </div>

                {/* Right side: Reference */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#efefef] mb-3">{t.helpCSSReferenceTitle}</h3>

                  <div className={`bg-[#1e1e1e] rounded-lg p-4 transition-all duration-200 ${hoveredSection === 'global' ? 'ring-2 ring-[#2196F3] bg-[#2196F3]/10' : ''}`}>
                    <h4 className="font-semibold text-[#efefef] mb-1">{t.helpGlobalTitle}</h4>
                    <p className="text-[#efefef]/70 text-sm">{t.helpGlobalDesc}</p>
                  </div>

                  <div className={`bg-[#1e1e1e] rounded-lg p-4 transition-all duration-200 ${hoveredSection === 'language' ? 'ring-2 ring-[#2196F3] bg-[#2196F3]/10' : ''}`}>
                    <h4 className="font-semibold text-[#efefef] mb-1">{t.helpLanguageTitle}</h4>
                    <p className="text-[#efefef]/70 text-sm">{t.helpLanguageDesc}</p>
                  </div>

                  <div className={`bg-[#1e1e1e] rounded-lg p-4 transition-all duration-200 ${hoveredSection === 'role' ? 'ring-2 ring-[#2196F3] bg-[#2196F3]/10' : ''}`}>
                    <h4 className="font-semibold text-[#efefef] mb-1">{t.helpRoleTitle}</h4>
                    <p className="text-[#efefef]/70 text-sm">{t.helpRoleDesc}</p>
                  </div>

                  <div className={`bg-[#1e1e1e] rounded-lg p-4 transition-all duration-200 ${hoveredSection === 'animation' ? 'ring-2 ring-[#2196F3] bg-[#2196F3]/10' : ''}`}>
                    <h4 className="font-semibold text-[#efefef] mb-1">{t.helpAnimationsTitle}</h4>
                    <p className="text-[#efefef]/70 text-sm">{t.helpAnimationsDesc}</p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="space-y-3 pt-6 mt-6 border-t border-[#efefef]/10">
                <h3 className="text-lg font-semibold text-[#efefef]">{t.helpTipsTitle}</h3>
                <ul className="space-y-2 text-[#efefef]/70">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">💡</span>
                    <span>{t.helpTip1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">💡</span>
                    <span>{t.helpTip2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">💡</span>
                    <span>{t.helpTip3}</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSSCustomizer;
