import uvicorn
from src.core.config import HOST_RUN

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host=HOST_RUN,
        port=5000,
    )
