from fastapi import FastAPI

app = FastAPI(title='Smart Apartmaent AI API')

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Apartment Management System (AI-Powered)"}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "backend"}