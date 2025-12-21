from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "CHANGE_ME_SUPER_SECRET"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 วัน

    # ใช้ใน ai_agent.py (ถ้าต่อ LLM จริง)
    AI_PROVIDER_URL: str = "http://localhost:11434/api/chat"  # ตัวอย่าง (Ollama)
    AI_MODEL: str = "llama3.1"

    class Config:
        env_file = ".env"


settings = Settings()
