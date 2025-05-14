import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define the feature toggle interface
export interface FeatureToggles {
  useFakeIsFinal: boolean;
  fakeIsFinalThreshold: number; // Pause threshold in milliseconds
}

// Default values for the feature toggles
const defaultFeatureToggles: FeatureToggles = {
  useFakeIsFinal: false,
  fakeIsFinalThreshold: 350 // Default to 350ms
};

// Preset threshold options
export const thresholdPresets = {
  FAST: 200,
  NORMAL: 350,
  SLOW: 500
};

// Storage key for localStorage
const STORAGE_KEY = 'catt_feature_toggles';

// Create the context
const FeatureToggleContext = createContext<{
  featureToggles: FeatureToggles;
  toggleFeature: (featureName: keyof FeatureToggles) => void;
  updateThreshold: (threshold: number) => void;
  usePreset: (preset: keyof typeof thresholdPresets) => void;
}>({
  featureToggles: defaultFeatureToggles,
  toggleFeature: () => {},
  updateThreshold: () => {},
  usePreset: () => {}
});

// Helper to load toggles from localStorage
const loadTogglesFromStorage = (): FeatureToggles => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as FeatureToggles;
    }
  } catch (error) {
    console.warn('Failed to load feature toggles from localStorage:', error);
  }
  return defaultFeatureToggles;
};

// Helper to save toggles to localStorage
const saveTogglesToStorage = (toggles: FeatureToggles): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toggles));
  } catch (error) {
    console.warn('Failed to save feature toggles to localStorage:', error);
  }
};

// Provider component
export function FeatureToggleProvider({ children }: { children: ReactNode }) {
  const [featureToggles, setFeatureToggles] = useState<FeatureToggles>(defaultFeatureToggles);
  
  // Load saved toggles on component mount
  useEffect(() => {
    setFeatureToggles(loadTogglesFromStorage());
  }, []);
  
  // Save toggles to localStorage whenever they change
  useEffect(() => {
    saveTogglesToStorage(featureToggles);
  }, [featureToggles]);

  // Toggle a feature on/off
  const toggleFeature = (featureName: keyof FeatureToggles) => {
    setFeatureToggles(prev => ({
      ...prev,
      [featureName]: !prev[featureName]
    }));
  };
  
  // Update the pause threshold
  const updateThreshold = (threshold: number) => {
    if (threshold >= 100 && threshold <= 1000) { // Constrain between 100-1000ms
      setFeatureToggles(prev => ({
        ...prev,
        fakeIsFinalThreshold: threshold
      }));
    }
  };

  // Apply a preset threshold
  const usePreset = (preset: keyof typeof thresholdPresets) => {
    const thresholdValue = thresholdPresets[preset];
    updateThreshold(thresholdValue);
  };

  return (
    <FeatureToggleContext.Provider value={{ featureToggles, toggleFeature, updateThreshold, usePreset }}>
      {children}
    </FeatureToggleContext.Provider>
  );
}

// Custom hook to use the feature toggle context
export function useFeatureToggles() {
  const context = useContext(FeatureToggleContext);
  if (context === undefined) {
    throw new Error('useFeatureToggles must be used within a FeatureToggleProvider');
  }
  return context;
} 