# Guardrails AI Installation Script for Windows PowerShell
# AI.ttorney Lawyer Chatbot Security Setup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Guardrails AI Installation Script" -ForegroundColor Cyan
Write-Host "  AI.ttorney Lawyer Chatbot" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python version
Write-Host "Step 1: Checking Python version..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
Write-Host "  $pythonVersion" -ForegroundColor Green

if ($pythonVersion -match "3\.13") {
    Write-Host "  ⚠️  WARNING: Python 3.13 detected!" -ForegroundColor Red
    Write-Host "  Guardrails AI has compatibility issues with Python 3.13" -ForegroundColor Red
    Write-Host "  Recommended: Use Python 3.11 or 3.12 for full functionality" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue with limited functionality? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Installation cancelled." -ForegroundColor Red
        exit
    }
} elseif ($pythonVersion -match "3\.(11|12)") {
    Write-Host "  ✅ Python version is compatible!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Python 3.11 or 3.12 recommended for best compatibility" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Install Guardrails AI Core
Write-Host "Step 2: Installing Guardrails AI core..." -ForegroundColor Yellow
pip install guardrails-ai
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Failed to install Guardrails AI" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Guardrails AI core installed" -ForegroundColor Green
Write-Host ""

# Step 3: Install core dependencies
Write-Host "Step 3: Installing core dependencies..." -ForegroundColor Yellow
pip install torch transformers peft jinja2
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Some dependencies failed to install" -ForegroundColor Yellow
    Write-Host "  This is expected on Python 3.13" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Core dependencies installed" -ForegroundColor Green
}
Write-Host ""

# Step 4: Configure Guardrails Hub
Write-Host "Step 4: Configuring Guardrails Hub..." -ForegroundColor Yellow
Write-Host "  You may need to provide your Guardrails API key" -ForegroundColor Cyan
guardrails configure
Write-Host ""

# Step 5: Install validators
Write-Host "Step 5: Installing Guardrails validators..." -ForegroundColor Yellow

$validators = @(
    "hub://guardrails/toxic_language",
    "hub://guardrails/bias_check",
    "hub://guardrails/sensitive_topics",
    "hub://guardrails/restrict_to_topic",
    "hub://guardrails/regex_match"
)

foreach ($validator in $validators) {
    Write-Host "  Installing $validator..." -ForegroundColor Cyan
    guardrails hub install $validator
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ Installed" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  Failed to install" -ForegroundColor Yellow
    }
}

Write-Host ""

# Step 6: Install advanced validators (optional)
Write-Host "Step 6: Installing advanced validators (optional)..." -ForegroundColor Yellow
Write-Host "  These may take longer and require more dependencies" -ForegroundColor Cyan

$advancedValidators = @(
    "hub://guardrails/llamaguard_7b",
    "hub://groundedai/grounded_ai_hallucination"
)

$installAdvanced = Read-Host "Install advanced validators? (y/n)"
if ($installAdvanced -eq "y") {
    foreach ($validator in $advancedValidators) {
        Write-Host "  Installing $validator..." -ForegroundColor Cyan
        guardrails hub install $validator
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ Installed" -ForegroundColor Green
        } else {
            Write-Host "    ⚠️  Failed to install" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  Skipping advanced validators" -ForegroundColor Yellow
}

Write-Host ""

# Step 7: Verify installation
Write-Host "Step 7: Verifying installation..." -ForegroundColor Yellow
guardrails hub list
Write-Host ""

# Step 8: Test configuration
Write-Host "Step 8: Testing Guardrails configuration..." -ForegroundColor Yellow
python -c "from config.guardrails_config import get_guardrails_instance; print('✅ Guardrails loaded successfully')"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Configuration test passed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Configuration test failed" -ForegroundColor Yellow
    Write-Host "  Check that config/guardrails_config.py exists" -ForegroundColor Yellow
}

Write-Host ""

# Step 9: Environment variables check
Write-Host "Step 9: Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "ENABLE_GUARDRAILS") {
        Write-Host "  ✅ ENABLE_GUARDRAILS found in .env" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  ENABLE_GUARDRAILS not found in .env" -ForegroundColor Yellow
        Write-Host "  Add the following to your .env file:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  ENABLE_GUARDRAILS=true" -ForegroundColor White
        Write-Host "  GUARDRAILS_STRICT_MODE=true" -ForegroundColor White
        Write-Host "  GUARDRAILS_LOG_SECURITY_EVENTS=true" -ForegroundColor White
        Write-Host "  GUARDRAILS_MAX_RETRIES=2" -ForegroundColor White
        Write-Host "  GUARDRAILS_TIMEOUT_SECONDS=30" -ForegroundColor White
    }
} else {
    Write-Host "  ⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "  Create a .env file with Guardrails configuration" -ForegroundColor Yellow
}

Write-Host ""

# Final summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Ensure .env file has Guardrails configuration" -ForegroundColor White
Write-Host "  2. Run test suite: python data/test_guardrails.py" -ForegroundColor White
Write-Host "  3. Review GUARDRAILS_SETUP.md for detailed documentation" -ForegroundColor White
Write-Host ""
Write-Host "For support, check:" -ForegroundColor Yellow
Write-Host "  - https://docs.guardrailsai.com/" -ForegroundColor Cyan
Write-Host "  - GUARDRAILS_SETUP.md in project root" -ForegroundColor Cyan
Write-Host ""
