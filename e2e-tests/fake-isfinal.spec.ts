import { test, expect } from '@playwright/test';

test.describe('Fake isFinal Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Select English as the source language
    await page.getByText('English').click();
  });
  
  test('should be able to toggle the fake isFinal feature', async ({ page }) => {
    // Open settings panel
    await page.getByTestId('settings-button').click();
    
    // Find and click the toggle switch
    const toggleSwitch = page.getByTestId('useFakeIsFinal-toggle');
    await expect(toggleSwitch).toBeVisible();
    
    // Verify initial state (should be off)
    await expect(toggleSwitch).not.toBeChecked();
    
    // Toggle the feature on
    await toggleSwitch.click();
    
    // Verify the toggle is now on
    await expect(toggleSwitch).toBeChecked();
    
    // Verify the threshold slider is now visible
    const thresholdSlider = page.getByTestId('threshold-slider');
    await expect(thresholdSlider).toBeVisible();
  });
  
  test('should be able to adjust the threshold', async ({ page }) => {
    // Open settings panel
    await page.getByTestId('settings-button').click();
    
    // Toggle the feature on
    const toggleSwitch = page.getByTestId('useFakeIsFinal-toggle');
    await toggleSwitch.click();
    
    // Adjust the threshold slider to 500ms
    const thresholdSlider = page.getByTestId('threshold-slider');
    await thresholdSlider.fill('500');
    
    // Verify the label shows 500ms
    const thresholdLabel = page.getByTestId('threshold-label');
    await expect(thresholdLabel).toContainText('500ms');
  });
  
  test('should be able to use preset threshold values', async ({ page }) => {
    // Open settings panel
    await page.getByTestId('settings-button').click();
    
    // Toggle the feature on
    const toggleSwitch = page.getByTestId('useFakeIsFinal-toggle');
    await toggleSwitch.click();
    
    // Get the threshold label to check for updates
    const thresholdLabel = page.getByTestId('threshold-label');
    
    // Click the "Fast" preset button
    const fastPreset = page.getByTestId('preset-fast');
    await fastPreset.click();
    
    // Verify the threshold is set to the Fast preset (200ms)
    await expect(thresholdLabel).toContainText('200ms');
    
    // Click the "Slow" preset button
    const slowPreset = page.getByTestId('preset-slow');
    await slowPreset.click();
    
    // Verify the threshold is set to the Slow preset (500ms)
    await expect(thresholdLabel).toContainText('500ms');
    
    // Click the "Normal" preset button
    const normalPreset = page.getByTestId('preset-normal');
    await normalPreset.click();
    
    // Verify the threshold is set to the Normal preset (350ms)
    await expect(thresholdLabel).toContainText('350ms');
  });
  
  test('Settings should persist after page refresh', async ({ page }) => {
    // Open settings panel
    await page.getByTestId('settings-button').click();
    
    // Toggle the feature on
    const toggleSwitch = page.getByTestId('useFakeIsFinal-toggle');
    await toggleSwitch.click();
    
    // Click the "Slow" preset button for a known value
    const slowPreset = page.getByTestId('preset-slow');
    await slowPreset.click();
    
    // Verify the threshold is set to the Slow preset (500ms)
    const thresholdLabel = page.getByTestId('threshold-label');
    await expect(thresholdLabel).toContainText('500ms');
    
    // Refresh the page
    await page.reload();
    
    // Select English as the source language again
    await page.getByText('English').click();
    
    // Open settings panel
    await page.getByTestId('settings-button').click();
    
    // Verify toggle is still on
    await expect(toggleSwitch).toBeChecked();
    
    // Verify threshold is still 500ms
    await expect(thresholdLabel).toContainText('500ms');
  });
  
  test('should show visual indicators for transcript status', async ({ page }) => {
    // Start listening
    await page.getByText('Start Listening').click();
    
    // Check that the original transcript shows an amber indicator (processing)
    const statusIndicator = page.getByTestId('status-indicator-en');
    await expect(statusIndicator).toBeVisible();
    
    // Note: We can't reliably test the actual speech recognition in an e2e test
    // since it depends on browser permissions and microphone access
    // This test just verifies that the visual elements are present
  });
}); 