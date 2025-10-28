#!/usr/bin/env python3
"""
Download YouTube videos from the command line
Standalone script for LiveDance project

Usage examples:
  # Best quality video
  python download_youtube.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  # Audio only
  python download_youtube.py --audio "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  # Custom output filename
  python download_youtube.py -o "my_dance_video" "URL"

  # Specific quality
  python download_youtube.py -q 720p "URL"

  # Use cookies for age-restricted videos
  python download_youtube.py --cookies cookies.txt "URL"

  # Get video info without downloading
  python download_youtube.py --info "URL"
"""

import argparse
import sys
from pathlib import Path

# Add backend directory to path to import youtube_downloader
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from youtube_downloader import YouTubeDownloader


def main():
    parser = argparse.ArgumentParser(
        description="Download YouTube videos for LiveDance pose analysis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download best quality video
  %(prog)s "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  # Download audio only
  %(prog)s --audio "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  # Custom filename and quality
  %(prog)s -o "dance_tutorial" -q 720p "URL"

  # Get video info without downloading
  %(prog)s --info "URL"
        """
    )

    parser.add_argument(
        "url",
        help="YouTube video URL"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output filename (without extension)"
    )
    parser.add_argument(
        "-q", "--quality",
        default="best",
        choices=["best", "1080p", "720p", "480p"],
        help="Video quality (default: best)"
    )
    parser.add_argument(
        "--audio",
        action="store_true",
        help="Download audio only (m4a format)"
    )
    parser.add_argument(
        "--cookies",
        help="Path to cookies.txt (Netscape format) for age-restricted videos"
    )
    parser.add_argument(
        "-d", "--directory",
        default="backend/downloads",
        help="Download directory (default: backend/downloads)"
    )
    parser.add_argument(
        "--info",
        action="store_true",
        help="Get video information without downloading"
    )

    args = parser.parse_args()

    # Initialize downloader
    downloader = YouTubeDownloader(output_dir=args.directory)

    if args.info:
        # Get video info only
        print("Fetching video information...")
        info = downloader.get_video_info(args.url)

        if info["success"]:
            print("\n" + "="*60)
            print(f"Title: {info['title']}")
            print(f"Duration: {info['duration']}s ({info['duration']//60}m {info['duration']%60}s)")
            print(f"Uploader: {info['uploader']}")
            print(f"Views: {info['views']:,}")
            print("="*60)
        else:
            print(f"Error: {info['error']}", file=sys.stderr)
            sys.exit(1)

    else:
        # Download video
        print(f"Downloading {'audio' if args.audio else 'video'} from YouTube...")
        print(f"URL: {args.url}")
        if args.quality != "best" and not args.audio:
            print(f"Quality: {args.quality}")
        print()

        result = downloader.download_video(
            url=args.url,
            output_filename=args.output,
            audio_only=args.audio,
            quality=args.quality,
            cookies_file=args.cookies,
        )

        if result["success"]:
            print("\n" + "="*60)
            print("Download successful!")
            print(f"Title: {result['title']}")
            print(f"Duration: {result['duration']}s")
            print(f"Saved to: {result['filepath']}")
            print("="*60)
        else:
            print(f"\nError: {result['error']}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()