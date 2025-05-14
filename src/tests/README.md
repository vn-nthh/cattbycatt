# Fake isFinal Feature Testing

This directory contains tests for the fake isFinal feature, which allows for speech segments to be marked as final after a 350ms pause, enhancing the responsiveness of the transcription system.

## Test Setup

The tests use Vitest and React Testing Library to test the various components and features.

### Dependencies

The following dependencies are required for running the tests:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/react-hooks @testing-library/user-event jsdom
```

### Running Tests

To run all tests:

```bash
npm test
```

To run specific test files:

```bash
npm test -- src/tests/FeatureToggleTests.tsx
```

## Test Categories

The tests are organized based on the test scenarios in the testing plan:

1. **Feature Toggle Tests (FeatureToggleTests.tsx)**
   - TG-01: Toggle the feature on and off
   - TG-02: Feature state after refresh
   - TG-03: UI indication of feature state

2. **Speech Recognition Tests (SpeechRecognitionTests.tsx)**
   - SR-01: Speech recognition with native isFinal
   - SR-02: Speech recognition with fake isFinal
   - SR-03: Continuous speech in both modes
   - SR-04: Varying pause lengths

3. **Translation Tests (TranslationTests.tsx)**
   - TR-01: Translations with native isFinal
   - TR-02: Translations with fake isFinal
   - TR-03: Translation quality comparison
   - TR-04: Multiple target languages

4. **Performance Tests (PerformanceTests.tsx)**
   - PF-01: CPU usage comparison
   - PF-02: Long speech responsiveness
   - PF-03: Time between pause and finalization
   - PF-04: Handling rapid speech with frequent pauses

## Mocking Strategy

The tests use mocks for:

1. Web Speech API
2. Translation API calls
3. Performance metrics
4. Timing functions (for testing the 350ms threshold)

## Test Implementation Notes

- The tests focus on verifying the correctness of the fake isFinal implementation
- Performance tests provide a framework for collecting metrics but require manual analysis
- Some tests are structured as integration tests to validate the feature in a realistic context

## Customizing Tests

To adjust the threshold being tested:

1. Update the `vi.advanceTimersByTime(350)` calls in the tests to use a different value
2. If the actual implementation threshold is changed, update the tests to match

## Results Analysis

After running the tests, analyze the results to:

1. Verify feature functionality
2. Compare performance between native and fake isFinal modes
3. Identify any regressions or issues
4. Collect metrics for optimizing the pause threshold

## Next Steps

Once testing is complete, consider:

1. Adjusting the 350ms threshold based on test results
2. Adding localStorage persistence for the toggle state
3. Including additional UI improvements based on user feedback
4. Creating more sophisticated test fixtures for real-world scenarios 