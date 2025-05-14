import { useFeatureToggles, FeatureToggles } from '../lib/featureToggles';

interface FeatureToggleSwitchProps {
  feature: keyof FeatureToggles;
  label: string;
  description?: string;
  className?: string;
}

export function FeatureToggleSwitch({ 
  feature, 
  label, 
  description, 
  className = '' 
}: FeatureToggleSwitchProps) {
  const { featureToggles, toggleFeature } = useFeatureToggles();
  
  const isEnabled = featureToggles[feature];
  
  // Convert feature name to a readable format for labels
  const featureLabel = feature === 'useFakeIsFinal' ? 'Fake isFinal' : label;
  
  return (
    <div className={`flex items-center justify-between p-2 ${className}`}>
      <div>
        <div className="text-sm font-medium" data-testid={`${feature}-label`}>{label}</div>
        {description && (
          <div className="text-xs text-gray-500">{description}</div>
        )}
      </div>
      <button
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          isEnabled ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
        onClick={() => toggleFeature(feature)}
        type="button"
        role="switch"
        aria-checked={isEnabled}
        aria-label={featureLabel}
        data-testid={`${feature}-toggle`}
      >
        <span className="sr-only">{featureLabel}</span>
        <span 
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`} 
        />
      </button>
    </div>
  );
} 