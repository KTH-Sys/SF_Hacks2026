# One-command local dev start for Barter backend (Windows PowerShell)
$ErrorActionPreference = "Stop"

# Always run from the directory containing this script
Set-Location $PSScriptRoot

# Create venv if missing
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv .venv
}

& .venv\Scripts\Activate.ps1

# Install / sync dependencies
pip install -q -r requirements.txt

# Copy env file if missing
if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host ""
    Write-Host "WARNING: Created .env from .env.example"
    Write-Host "   Set MONGODB_URL and GEMINI_API_KEY before running again."
    exit 1
}

Write-Host ""
Write-Host "Starting Barter API on http://localhost:8000"
Write-Host "   Swagger docs: http://localhost:8000/docs"
Write-Host ""
python -m uvicorn main:app --reload --port 8000
