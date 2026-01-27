Set-Location $PSScriptRoot

# Install or update dependencies for the FastAPI backend.
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Run the development server.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

