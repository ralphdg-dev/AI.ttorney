try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

import numpy as np
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class BlurDetector:
    """
    Detects blurry images using Laplacian variance algorithm.
    Lower variance indicates blurrier images.
    """
    
    # Threshold values for blur detection (calibrated for ID cards/documents)
    VERY_BLURRY_THRESHOLD = 50.0
    BLURRY_THRESHOLD = 100.0
    ACCEPTABLE_THRESHOLD = 150.0
    
    @staticmethod
    def detect_blur(image_bytes: bytes) -> tuple[bool, float]:
        """
        Detect if an image is blurry using Laplacian variance.
        
        Args:
            image_bytes: Raw image data as bytes
            
        Returns:
            Tuple of (is_blurry: bool, blur_score: float)
            - is_blurry: True if image is considered blurry
            - blur_score: Laplacian variance score (higher = sharper)
        """
        # If cv2 is not available, return non-blurry (skip detection)
        if not CV2_AVAILABLE:
            logger.warning("OpenCV (cv2) not available - skipping blur detection")
            return False, 0.0
            
        try:
            # Convert bytes to PIL Image
            pil_image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to grayscale if needed
            if pil_image.mode != 'L':
                pil_image = pil_image.convert('L')
            
            # Convert PIL to numpy array
            np_image = np.array(pil_image)
            
            # Apply Laplacian operator
            laplacian = cv2.Laplacian(np_image, cv2.CV_64F)
            
            # Calculate variance (this is our blur score)
            blur_score = laplacian.var()
            
            # Determine if image is blurry based on threshold
            is_blurry = blur_score < BlurDetector.BLURRY_THRESHOLD
            
            logger.info(f"Blur detection completed - Score: {blur_score:.2f}, Blurry: {is_blurry}")
            
            return is_blurry, blur_score
            
        except Exception as e:
            logger.error(f"Error detecting blur: {str(e)}")
            # Return non-blurry on error to avoid blocking uploads
            return False, 0.0
    
    @staticmethod
    def get_blur_quality_level(blur_score: float) -> str:
        """
        Get a human-readable quality level based on blur score.
        
        Args:
            blur_score: Laplacian variance score
            
        Returns:
            String describing image quality: 'very_blurry', 'blurry', 'acceptable', 'sharp'
        """
        if blur_score < BlurDetector.VERY_BLURRY_THRESHOLD:
            return 'very_blurry'
        elif blur_score < BlurDetector.BLURRY_THRESHOLD:
            return 'blurry'
        elif blur_score < BlurDetector.ACCEPTABLE_THRESHOLD:
            return 'acceptable'
        else:
            return 'sharp'
    
    @staticmethod
    def get_blur_message(blur_score: float) -> str:
        """
        Get an appropriate warning message based on blur score.
        
        Args:
            blur_score: Laplacian variance score
            
        Returns:
            Warning message for the user
        """
        quality = BlurDetector.get_blur_quality_level(blur_score)
        
        if quality == 'very_blurry':
            return "Image is very blurry and may be rejected. Please retake with better lighting and focus."
        elif quality == 'blurry':
            return "Image appears blurry. Consider retaking for better clarity."
        elif quality == 'acceptable':
            return "Image quality is acceptable but could be sharper."
        else:
            return None  # No message for sharp images
