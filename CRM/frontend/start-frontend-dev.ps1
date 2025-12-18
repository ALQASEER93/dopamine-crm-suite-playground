$ErrorActionPreference = "Stop"

# Get script directory and set working directory to frontend root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Run the development server
npm run dev
