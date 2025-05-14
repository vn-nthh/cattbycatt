# PowerShell script for installing test dependencies and running tests

Write-Host "Setting up tests for Fake isFinal feature..." -ForegroundColor Green

# Install test dependencies
Write-Host "Installing test dependencies..." -ForegroundColor Cyan
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/react-hooks @testing-library/user-event jsdom

# Run tests
Write-Host "Running tests..." -ForegroundColor Cyan
npm test

Write-Host "Tests completed. Please analyze the results." -ForegroundColor Green
Write-Host "If you make changes to the implementation based on test results, remember to update the documentation." -ForegroundColor Yellow 