#!/bin/bash

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"

# Start gunicorn
gunicorn --bind=0.0.0.0:8000 --timeout 600 run:app