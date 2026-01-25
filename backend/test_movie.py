try:
    from moviepy.editor import VideoFileClip
    print("SUCCESS: MoviePy is working perfectly!")
except ImportError as e:
    print(f"FAILURE: {e}")
except Exception as e:
    print(f"ERROR: {e}")