# End-to-End Tests for CATT by Catt

This directory contains end-to-end tests using Playwright, allowing for testing the application in real browsers.

## Setup

Before running the tests, you need to install Playwright and its dependencies:

```bash
# Run the setup script
node install-playwright.js
```

This will install Playwright, browser binaries, and add the necessary npm scripts to your package.json.

## Running the Tests

Once set up, you can run the tests using one of the following commands:

```bash
# Run all tests headlessly
npm run test:e2e

# Run tests with UI mode
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug
```

## Test Files

- `fake-isfinal.spec.ts` - Tests for the fake isFinal feature and its UI

## Test Limitations

Some aspects of the application are challenging to test in an automated end-to-end environment:

1. **Speech Recognition**: Testing actual speech recognition requires microphone access and browser permissions, which are difficult to automate.

2. **Timing-Based Tests**: Tests for the pause threshold timing are difficult to simulate accurately in a test environment.

For these scenarios, consider manual testing in a real browser environment.

## CI/CD Integration

The Playwright configuration is set up to work in CI environments. When running in CI:

- Tests will retry up to 2 times on failure
- Tests will run with a single worker to avoid resource contention
- "Only" tests (tests with `.only`) will be forbidden

## Browser Support

Tests are configured to run across the following browsers:

- Chromium
- Firefox
- WebKit (Safari) 