"""Export video, CSV, JSON and PDF with the same analysis used by the UI.

Usage: python save_processed_video.py input.mp4 --output analysis_results
"""
from src.cli import main

if __name__ == '__main__':
    main()
