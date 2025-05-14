# Toggleable Fake isFinal Feature - Implementation Plan

## Overview
This feature will add the ability to toggle between the native Web Speech API's isFinal property and a custom implementation that considers a speech segment final if the speaker stops speaking for 350ms. This can help create more responsive transcription chunks without modifying existing functionality.

## Current Implementation
- The Web Speech API's `isFinal` property is used to determine when a speech segment is complete
- Final transcripts are sent for translation and stored in the Convex database
- Interim transcripts are displayed but not stored or translated

## Implementation Tasks

### 1. Create Feature Toggle Configuration
- [x] Create a new configuration file for feature toggles
- [x] Add toggle state management for the fake isFinal feature

### 2. Implement the Fake isFinal Detection Logic
- [x] Create a utility function to detect pauses in speech
- [x] Implement a timer-based mechanism to mark segments as final after 350ms of silence

### 3. Integrate with Existing Speech Recognition Code
- [x] Create a wrapper for the speech recognition results processing
- [x] Add logic to conditionally use native or fake isFinal based on toggle state

### 4. Add UI Controls
- [x] Add a toggle switch in the UI for the feature
- [x] Create a settings panel component if it doesn't exist

### 5. Update Backend Schema
- [x] Add a feature toggle field to the transcription schema (if needed)
- [x] Update the transcription storage logic to handle potentially more frequent chunks

### 6. Testing and Verification
- [ ] Test both toggle states to ensure consistent behavior
- [ ] Verify that translations work correctly with the fake isFinal feature
- [ ] Check performance impact with more frequent chunk processing

## Implementation Details

### Convex Schema Updates
~~The following field may need to be added to the transcription schema:~~
```typescript
// No schema changes were required as the feature was implemented entirely on the client side
```

### Component Architecture
- [x] Create a new `FeatureToggles.tsx` component
- [x] Add a context provider for feature toggle state management
- [x] Implement utility hooks for accessing toggle state

### Backend Considerations
No changes to existing code were made, only additions:
- [x] New utility functions for fake isFinal detection
- [x] New context providers for toggle state
- [x] New UI components for settings

## Rollback Plan
- [x] Document all new files created
- [x] Document all non-destructive additions to existing schema
- [x] Ensure toggle defaults to off for backward compatibility
- [x] Provide a list of files to remove if feature needs to be completely removed

## Next Steps
- [ ] Execute the testing plan in docs/fake-isfinal-testing-plan.md
- [ ] After testing, evaluate the effectiveness of the 350ms threshold and adjust if needed
- [ ] Consider making the toggle state persistent using localStorage in a future update 