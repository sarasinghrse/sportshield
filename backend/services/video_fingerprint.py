"""
S4 — Video Source Detection

Extracts key frames from a video, computes pHash for each frame,
and builds a video fingerprint that can be compared against other
videos or images in the asset database.

Uses OpenCV (cv2) for frame extraction. Falls back to Pillow-based
GIF extraction if cv2 is not available.
"""
import io
import tempfile
import os
from services.fingerprint import compute_phash, compare_hashes

# Attempt to import cv2; set flag if unavailable
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    print("[video_fingerprint] OpenCV not installed — using fallback GIF-only mode")


def extract_frames_cv2(video_bytes: bytes, max_frames: int = 12, strategy: str = "scene") -> list[bytes]:
    """
    Extract key frames from video bytes using OpenCV.

    Strategies:
      - "uniform": evenly spaced frames across the video
      - "scene": detect scene changes via frame differencing (better for sports highlights)

    Returns a list of JPEG-encoded frame bytes.
    """
    # Write video to temp file (cv2 needs a file path)
    tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    try:
        tmp.write(video_bytes)
        tmp.flush()
        tmp.close()

        cap = cv2.VideoCapture(tmp.name)
        if not cap.isOpened():
            print("[video_fingerprint] Could not open video")
            return []

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30

        if total_frames <= 0:
            return []

        frames = []

        if strategy == "scene" and total_frames > max_frames * 2:
            # Scene-change detection: compare consecutive frames
            prev_gray = None
            candidates = []  # (frame_idx, diff_score, frame_bytes)

            # Sample every Nth frame to keep it fast
            step = max(1, total_frames // (max_frames * 10))
            for i in range(0, total_frames, step):
                cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = cap.read()
                if not ret:
                    break
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                gray_small = cv2.resize(gray, (160, 90))

                if prev_gray is not None:
                    diff = cv2.absdiff(prev_gray, gray_small)
                    score = diff.mean()
                    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    candidates.append((i, score, buf.tobytes()))

                prev_gray = gray_small

            # Sort by scene-change score, pick top frames
            candidates.sort(key=lambda x: x[1], reverse=True)
            selected = candidates[:max_frames]
            # Re-sort by frame order for timeline consistency
            selected.sort(key=lambda x: x[0])
            frames = [c[2] for c in selected]

            # If scene detection found too few, fill with uniform
            if len(frames) < max_frames // 2:
                frames = []  # fall through to uniform
            else:
                cap.release()
                return frames

        # Uniform sampling fallback
        interval = max(1, total_frames // max_frames)
        for i in range(0, total_frames, interval):
            if len(frames) >= max_frames:
                break
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if not ret:
                break
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            frames.append(buf.tobytes())

        cap.release()
        return frames

    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


def extract_frames_fallback(video_bytes: bytes, max_frames: int = 8) -> list[bytes]:
    """
    Fallback frame extraction for GIF files using Pillow.
    For proper video support, install opencv-python.
    """
    from PIL import Image

    try:
        img = Image.open(io.BytesIO(video_bytes))
        if not hasattr(img, "n_frames"):
            return []

        n = img.n_frames
        interval = max(1, n // max_frames)
        frames = []

        for i in range(0, n, interval):
            if len(frames) >= max_frames:
                break
            img.seek(i)
            buf = io.BytesIO()
            img.convert("RGB").save(buf, format="JPEG", quality=85)
            frames.append(buf.getvalue())

        return frames
    except Exception as e:
        print(f"[video_fingerprint] Fallback extraction failed: {e}")
        return []


def extract_frames(video_bytes: bytes, max_frames: int = 12) -> list[bytes]:
    """Extract frames from video using best available method."""
    if HAS_CV2:
        frames = extract_frames_cv2(video_bytes, max_frames, strategy="scene")
        if frames:
            return frames
    return extract_frames_fallback(video_bytes, max_frames)


def compute_video_fingerprint(video_bytes: bytes, max_frames: int = 12) -> dict:
    """
    Compute a full video fingerprint.

    Returns:
    {
        "frameHashes": [str, ...],       # pHash of each key frame
        "frameCount": int,                # number of frames extracted
        "primaryHash": str,               # most representative frame hash (middle frame)
        "duration_estimate": float | None, # estimated duration in seconds
        "method": str,                    # "opencv" or "fallback"
    }
    """
    frames = extract_frames(video_bytes, max_frames)
    if not frames:
        return {
            "frameHashes": [],
            "frameCount": 0,
            "primaryHash": "",
            "duration_estimate": None,
            "method": "none",
            "error": "Could not extract frames from video",
        }

    hashes = []
    for frame_bytes in frames:
        try:
            h = compute_phash(frame_bytes)
            hashes.append(h)
        except Exception:
            pass

    primary = hashes[len(hashes) // 2] if hashes else ""

    # Estimate duration if cv2 is available
    duration = None
    if HAS_CV2:
        try:
            tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
            tmp.write(video_bytes)
            tmp.flush()
            tmp.close()
            cap = cv2.VideoCapture(tmp.name)
            total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            duration = round(total / fps, 1) if fps > 0 else None
            cap.release()
            os.unlink(tmp.name)
        except Exception:
            pass

    return {
        "frameHashes": hashes,
        "frameCount": len(hashes),
        "primaryHash": primary,
        "duration_estimate": duration,
        "method": "opencv" if HAS_CV2 else "fallback",
    }


def compare_video_to_assets(video_fingerprint: dict, assets: list[dict], threshold: float = 0.50) -> list[dict]:
    """
    Compare a video fingerprint against a list of existing assets.

    Each asset should have at least { "id", "phash", "filename", "type" }.
    For video assets, they may also have { "videoFingerprint": { "frameHashes": [...] } }.

    Returns matches sorted by best similarity:
    [
        {
            "assetId": str,
            "filename": str,
            "bestSimilarity": float,
            "matchType": "frame-to-image" | "frame-to-frame",
            "matchingFrames": int,
            "totalFramesChecked": int,
        },
        ...
    ]
    """
    if not video_fingerprint.get("frameHashes"):
        return []

    my_hashes = video_fingerprint["frameHashes"]
    matches = []

    for asset in assets:
        asset_id = asset.get("id", "")
        asset_phash = asset.get("phash", "")
        asset_type = asset.get("type", "image")
        asset_filename = asset.get("filename", "")

        best_sim = 0.0
        matching_frames = 0
        match_type = "frame-to-image"
        total_checked = 0

        # Compare against image asset's single pHash
        if asset_phash and asset_type == "image":
            for fh in my_hashes:
                try:
                    sim = compare_hashes(fh, asset_phash)
                    total_checked += 1
                    if sim > best_sim:
                        best_sim = sim
                    if sim >= threshold:
                        matching_frames += 1
                except Exception:
                    pass

        # Compare against video asset's frame hashes
        asset_vf = asset.get("videoFingerprint", {})
        if asset_vf and asset_vf.get("frameHashes"):
            match_type = "frame-to-frame"
            for fh in my_hashes:
                for ah in asset_vf["frameHashes"]:
                    try:
                        sim = compare_hashes(fh, ah)
                        total_checked += 1
                        if sim > best_sim:
                            best_sim = sim
                        if sim >= threshold:
                            matching_frames += 1
                    except Exception:
                        pass

        if best_sim >= threshold:
            matches.append({
                "assetId": asset_id,
                "filename": asset_filename,
                "bestSimilarity": round(best_sim, 4),
                "matchType": match_type,
                "matchingFrames": matching_frames,
                "totalFramesChecked": total_checked,
            })

    matches.sort(key=lambda m: m["bestSimilarity"], reverse=True)
    return matches
