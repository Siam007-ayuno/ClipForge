import cv2
import numpy as np
from typing import Tuple, Optional, Dict, Any


class ReframeService:
    """Detects speaker faces and computes optimal cropping/reframing parameters for vertical 9:16 video."""

    def __init__(self):
        self.mp_face_detector = None
        try:
            import mediapipe as mp
            if hasattr(mp, "solutions") and hasattr(mp.solutions, "face_detection"):
                self.mp_face_detector = mp.solutions.face_detection.FaceDetection(
                    model_selection=1, min_detection_confidence=0.5
                )
        except Exception as e:
            print(f"[REFRAME] MediaPipe initialization note: {e}")

    def detect_speaker_focus(
        self,
        video_path: str,
        start_time: float,
        end_time: float,
        sample_interval_sec: float = 3.0,
    ) -> float:
        """
        Samples at most 5 frames across the clip to determine the speaker's horizontal center (0.0 to 1.0).
        Fast, lightweight, and prevents seeking bottlenecks on large files.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return 0.5  # Fallback to center

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)

        duration = max(1.0, end_time - start_time)
        # Sample between 3 and 6 frames total
        num_samples = min(6, max(3, int(duration // sample_interval_sec)))
        sample_times = np.linspace(start_time + 0.5, max(start_time + 0.5, end_time - 0.5), num=num_samples)

        detected_x_positions = []

        for st in sample_times:
            target_frame = int(st * fps)
            if target_frame >= total_frames:
                continue
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            h, w, _ = frame.shape
            face_x = self._detect_face_in_frame(frame, w, h)
            if face_x is not None:
                detected_x_positions.append(face_x)

        cap.release()

        if not detected_x_positions:
            return 0.5  # Default center if no face found

        # Compute median of detected face positions to avoid outliers
        focus_x = float(np.median(detected_x_positions))
        return round(float(np.clip(focus_x, 0.15, 0.85)), 3)

    def _detect_face_in_frame(self, frame: np.ndarray, width: int, height: int) -> Optional[float]:
        """Detects the largest/most prominent face center X in a single frame."""
        # 1. Try MediaPipe Face Detection
        if self.mp_face_detector is not None:
            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = self.mp_face_detector.process(rgb_frame)
                if results and results.detections:
                    # Pick largest face
                    largest_face = None
                    max_area = 0
                    for det in results.detections:
                        bbox = det.location_data.relative_bounding_box
                        area = bbox.width * bbox.height
                        if area > max_area:
                            max_area = area
                            largest_face = bbox

                    if largest_face:
                        center_x = largest_face.xmin + (largest_face.width / 2.0)
                        return center_x
            except Exception:
                pass

        # 2. Fallback to OpenCV Haar Cascade if MediaPipe returned nothing
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(cascade_path)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=4)
            if len(faces) > 0:
                largest = max(faces, key=lambda f: f[2] * f[3])
                center_x = (largest[0] + largest[2] / 2.0) / width
                return center_x
        except Exception:
            pass

        return None

    def build_ffmpeg_filter(
        self,
        video_width: int,
        video_height: int,
        aspect_ratio: str = "9:16",
        reframe_mode: str = "auto_face",
        focus_x: float = 0.5,
        target_resolution: str = "1080p",
    ) -> str:
        """
        Builds the FFmpeg video filtergraph string for reframing.
        """
        # Determine output dimensions
        if target_resolution == "720p":
            out_w, out_h = 720, 1280
        else:
            out_w, out_h = 1080, 1920

        if aspect_ratio == "1:1":
            out_w, out_h = (1080, 1080) if target_resolution == "1080p" else (720, 720)

        # 1. Blurred Background Fit Mode (popular for wide group shots)
        if reframe_mode == "blurred_fit":
            return (
                f"split=2[bg][fg];"
                f"[bg]scale={out_w}:{out_h}:force_original_aspect_ratio=increase,"
                f"crop={out_w}:{out_h},"
                f"boxblur=luma_radius=min(h\,w)/15:luma_power=2[bg_blur];"
                f"[fg]scale={out_w}:-2:force_original_aspect_ratio=decrease[fg_scaled];"
                f"[bg_blur][fg_scaled]overlay=(W-w)/2:(H-h)/2"
            )

        # 2. Center or Auto Face Crop Mode
        crop_ratio = (out_w / out_h)
        # Calculate crop rectangle from source
        crop_h = video_height
        crop_w = int(crop_h * crop_ratio)

        # If source is narrower than target ratio, crop height instead
        if crop_w > video_width:
            crop_w = video_width
            crop_h = int(crop_w / crop_ratio)

        # Ensure even numbers
        crop_w = crop_w - (crop_w % 2)
        crop_h = crop_h - (crop_h % 2)

        # Calculate crop_x based on focus_x
        ideal_x = int(focus_x * video_width - crop_w / 2.0)
        max_x = max(0, video_width - crop_w)
        crop_x = int(np.clip(ideal_x, 0, max_x))
        crop_x = crop_x - (crop_x % 2)

        # Calculate crop_y (centered vertically)
        max_y = max(0, video_height - crop_h)
        crop_y = int(max_y / 2)
        crop_y = crop_y - (crop_y % 2)

        return f"crop={crop_w}:{crop_h}:{crop_x}:{crop_y},scale={out_w}:{out_h}"
