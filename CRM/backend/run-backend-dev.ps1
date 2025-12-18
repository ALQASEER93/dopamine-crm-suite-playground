$ErrorActionPreference = "Stop"

# Get script directory and set working directory to backend root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Install or update dependencies for the FastAPI backend.
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Run the development server.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
