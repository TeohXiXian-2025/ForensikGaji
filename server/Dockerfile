# Use an official lightweight Python image
FROM python:3.10-slim

# Set the working directory inside the cloud computer
WORKDIR /app

# 🟢 FIX: Added poppler-utils so pdf2image works in the cloud!
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 poppler-utils && rm -rf /var/lib/apt/lists/*

# Copy your requirements file and install Python libraries
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend code into the cloud computer
COPY . .

# Expose port 8080 (This is the port Google Cloud Run forces you to use)
EXPOSE 8080

# The command to start your FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]