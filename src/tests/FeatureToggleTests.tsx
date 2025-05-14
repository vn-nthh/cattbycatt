import React from 'react';
// NOTE: You'll need to install vitest and @testing-library/react with:
// npm install --save-dev vitest @testing-library/react @testing-library/react-hooks @testing-library/user-event
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FeatureToggleProvider, useFeatureToggles } from '../lib/featureToggles';
import { SettingsPanel } from '../components/SettingsPanel';

// Create a test component that uses the feature toggle
function TestComponent() {
  const { featureToggles, toggleFeature } = useFeatureToggles();
  
  return (
    <div>
      <div data-testid="toggle-state">{featureToggles.useFakeIsFinal ? 'enabled' : 'disabled'}</div>
      <div data-testid="threshold-value">{featureToggles.fakeIsFinalThreshold}</div>
      <button onClick={() => toggleFeature('useFakeIsFinal')}>Toggle</button>
    </div>
  );
}

describe('Feature Toggle Tests (TG-01, TG-02, TG-03)', () => {
  // Test toggle functionality
  it('should toggle the feature on and off via UI (TG-01)', async () => {
    render(
      <FeatureToggleProvider>
        <SettingsPanel />
      </FeatureToggleProvider>
    );
    
    // Find the feature toggle switch
    const toggleSwitch = screen.getByTestId('useFakeIsFinal-toggle');
    expect(toggleSwitch).toBeInTheDocument();
    
    // Feature should be off by default
    expect(toggleSwitch).not.toBeChecked();
    
    // Toggle the feature on
    fireEvent.click(toggleSwitch);
    
    // Should now be on
    expect(toggleSwitch).toBeChecked();
    
    // Toggle the feature off again
    fireEvent.click(toggleSwitch);
    
    // Should now be off
    expect(toggleSwitch).not.toBeChecked();
  });
  
  it('should have feature disabled by default after refresh (TG-02)', () => {
    render(
      <FeatureToggleProvider>
        <TestComponent />
      </FeatureToggleProvider>
    );
    
    // Feature should be off by default
    expect(screen.getByTestId('toggle-state')).toHaveTextContent('disabled');
  });
  
  it('should clearly indicate feature state in UI (TG-03)', () => {
    render(
      <FeatureToggleProvider>
        <SettingsPanel />
      </FeatureToggleProvider>
    );
    
    // Check if there is a clear visual indicator of the feature state
    const toggleSwitch = screen.getByTestId('useFakeIsFinal-toggle');
    const toggleLabel = screen.getByTestId('useFakeIsFinal-label');
    
    expect(toggleSwitch).toBeInTheDocument();
    expect(toggleLabel).toBeInTheDocument();
    
    // Toggle the feature on
    fireEvent.click(toggleSwitch);
    
    // Visual state should change
    expect(toggleSwitch).toBeChecked();
  });
  
  // Test threshold configuration
  it('should show threshold slider when feature is enabled (TG-04)', () => {
    render(
      <FeatureToggleProvider>
        <SettingsPanel />
      </FeatureToggleProvider>
    );
    
    // Threshold slider should not be visible by default (feature is off)
    expect(screen.queryByTestId('threshold-slider')).not.toBeInTheDocument();
    
    // Toggle the feature on
    const toggleSwitch = screen.getByTestId('useFakeIsFinal-toggle');
    fireEvent.click(toggleSwitch);
    
    // Threshold slider should now be visible
    const thresholdSlider = screen.getByTestId('threshold-slider');
    expect(thresholdSlider).toBeInTheDocument();
    
    // Default value should be 350ms
    expect(thresholdSlider).toHaveValue('350');
  });
  
  it('should update threshold value when slider is changed (TG-05)', () => {
    render(
      <FeatureToggleProvider>
        <SettingsPanel />
        <TestComponent />
      </FeatureToggleProvider>
    );
    
    // Toggle the feature on to make the slider visible
    const toggleSwitch = screen.getByTestId('useFakeIsFinal-toggle');
    fireEvent.click(toggleSwitch);
    
    // Get the threshold slider
    const thresholdSlider = screen.getByTestId('threshold-slider');
    
    // Change the slider value to 500ms
    fireEvent.change(thresholdSlider, { target: { value: '500' } });
    
    // Check if the threshold value was updated
    expect(screen.getByTestId('threshold-value')).toHaveTextContent('500');
    
    // Check if the label was updated
    const thresholdLabel = screen.getByTestId('threshold-label');
    expect(thresholdLabel).toHaveTextContent('Pause Threshold: 500ms');
  });
  
  it('should persist threshold value in localStorage (TG-06)', () => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    render(
      <FeatureToggleProvider>
        <SettingsPanel />
      </FeatureToggleProvider>
    );
    
    // Toggle the feature on
    const toggleSwitch = screen.getByTestId('useFakeIsFinal-toggle');
    fireEvent.click(toggleSwitch);
    
    // Get the threshold slider and change its value
    const thresholdSlider = screen.getByTestId('threshold-slider');
    fireEvent.change(thresholdSlider, { target: { value: '500' } });
    
    // Check if localStorage.setItem was called with updated values
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'catt_feature_toggles',
      expect.stringContaining('"fakeIsFinalThreshold":500')
    );
  });
}); 