"""
YouTube Video Downloader Module
Downloads YouTube videos for pose estimation analysis
"""

import os
import yt_dlp
from pathlib import Path


class YouTubeDownloader:
    """Handles downloading YouTube videos for dance analysis"""

    def __init__(self, output_dir="downloads"):
        """
        Initialize the downloader

        Args:
            output_dir: Directory to save downloaded videos (default: 'downloads')
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def _progress_hook(self, d):
        """Callback for download progress"""
        if d.get("status") == "downloading":
            pct = d.get("_percent_str", "").strip()
            spd = d.get("_speed_str", "")
            eta = d.get("_eta_str", "")
            print(f"\r{pct}  {spd}  ETA {eta}", end="", flush=True)
        elif d.get("status") == "finished":
            print(f"\nDownload complete: {d.get('filename')}")

    def download_video(
        self,
        url,
        output_filename=None,
        audio_only=False,
        quality="best",
        cookies_file=None,
        progress_callback=None
    ):
        """
        Download a YouTube video

        Args:
            url: YouTube video URL
            output_filename: Custom filename (without extension) or None for auto
            audio_only: If True, download only audio (m4a format)
            quality: Video quality ('best', '1080p', '720p', '480p')
            cookies_file: Path to cookies.txt for age-restricted videos
            progress_callback: Optional callback function for progress updates

        Returns:
            dict with 'success', 'filepath', 'title', 'duration' keys
        """
        try:
            # Determine output template
            if output_filename:
                outtmpl = str(self.output_dir / f"{output_filename}.%(ext)s")
            else:
                outtmpl = str(self.output_dir / "%(title)s-%(id)s.%(ext)s")

            # Base options
            ydl_opts = {
                "outtmpl": outtmpl,
                "progress_hooks": [progress_callback or self._progress_hook],
                "noplaylist": True,
                "quiet": False,
                "no_warnings": False,
                "nocheckcertificate": True,  # Fix for SSL certificate issues on macOS
            }

            if audio_only:
                # Audio-only download
                ydl_opts["format"] = "bestaudio/best"
                ydl_opts["postprocessors"] = [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "m4a",
                    "preferredquality": "0",  # best quality
                }]
            else:
                # Video download
                format_map = {
                    "best": "bv*+ba/b",
                    "1080p": "bestvideo[height<=1080]+bestaudio/best",
                    "720p": "bestvideo[height<=720]+bestaudio/best",
                    "480p": "bestvideo[height<=480]+bestaudio/best",
                }
                ydl_opts["format"] = format_map.get(quality, "bv*+ba/b")
                ydl_opts["merge_output_format"] = "mp4"
                ydl_opts["postprocessors"] = [
                    {"key": "FFmpegVideoConvertor", "preferedformat": "mp4"}
                ]

            if cookies_file:
                ydl_opts["cookiefile"] = cookies_file

            # Download the video
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)

                # Get the final filename
                if audio_only:
                    # For audio, extension changes to m4a
                    if output_filename:
                        filepath = self.output_dir / f"{output_filename}.m4a"
                    else:
                        filepath = self.output_dir / f"{info['title']}-{info['id']}.m4a"
                else:
                    # For video, extension is mp4
                    if output_filename:
                        filepath = self.output_dir / f"{output_filename}.mp4"
                    else:
                        filepath = self.output_dir / f"{info['title']}-{info['id']}.mp4"

                return {
                    "success": True,
                    "filepath": str(filepath),
                    "title": info.get("title", "Unknown"),
                    "duration": info.get("duration", 0),
                    "thumbnail": info.get("thumbnail", ""),
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "filepath": None,
            }

    def get_video_info(self, url):
        """
        Get video information without downloading

        Args:
            url: YouTube video URL

        Returns:
            dict with video metadata
        """
        try:
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "nocheckcertificate": True,  # Fix for SSL certificate issues on macOS
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return {
                    "success": True,
                    "title": info.get("title", ""),
                    "duration": info.get("duration", 0),
                    "thumbnail": info.get("thumbnail", ""),
                    "uploader": info.get("uploader", ""),
                    "views": info.get("view_count", 0),
                    "description": info.get("description", ""),
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }


# Standalone CLI usage
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Download YouTube videos for dance pose analysis"
    )
    parser.add_argument("url", help="YouTube video URL")
    parser.add_argument(
        "-o", "--output",
        help="Output filename (without extension)"
    )
    parser.add_argument(
        "--audio",
        action="store_true",
        help="Download audio only (m4a)"
    )
    parser.add_argument(
        "-q", "--quality",
        default="best",
        choices=["best", "1080p", "720p", "480p"],
        help="Video quality (default: best)"
    )
    parser.add_argument(
        "--cookies",
        help="Path to cookies.txt for age-restricted videos"
    )
    parser.add_argument(
        "-d", "--directory",
        default="downloads",
        help="Download directory (default: downloads)"
    )
    parser.add_argument(
        "--info",
        action="store_true",
        help="Get video info without downloading"
    )

    args = parser.parse_args()

    downloader = YouTubeDownloader(output_dir=args.directory)

    if args.info:
        print("Fetching video information...")
        info = downloader.get_video_info(args.url)
        if info["success"]:
            print(f"\nTitle: {info['title']}")
            print(f"Duration: {info['duration']}s")
            print(f"Uploader: {info['uploader']}")
            print(f"Views: {info['views']:,}")
        else:
            print(f"Error: {info['error']}")
    else:
        print(f"Downloading {'audio' if args.audio else 'video'} from YouTube...")
        result = downloader.download_video(
            url=args.url,
            output_filename=args.output,
            audio_only=args.audio,
            quality=args.quality,
            cookies_file=args.cookies,
        )

        if result["success"]:
            print(f"\nSuccess! Saved to: {result['filepath']}")
            print(f"Title: {result['title']}")
            print(f"Duration: {result['duration']}s")
        else:
            print(f"\nError: {result['error']}")