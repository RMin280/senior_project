"""Start the API locally:  python run.py   ->  http://localhost:5000/api/health"""
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(port=5000, debug=False)
