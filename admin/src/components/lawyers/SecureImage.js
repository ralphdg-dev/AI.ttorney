import React from 'react';
import { Download, ZoomIn } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import lawyerApplicationsService from '../../services/lawyerApplicationsService';

const SecureImage = React.memo(({ imagePath, alt, className, primaryBucket }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const loadedPathRef = React.useRef(null);

  const possibleBuckets = React.useMemo(() => [
    primaryBucket,
    'uploads',
    'images', 
    'lawyer-documents',
    'application-files',
    'documents',
    'files'
  ].filter(Boolean), [primaryBucket]);

  React.useEffect(() => {
    if (!imagePath) {
      setImageUrl(null);
      setError(null);
      setImageLoaded(false);
      loadedPathRef.current = null;
      return;
    }

    // Don't reload if we already loaded this exact path
    if (loadedPathRef.current === imagePath && imageUrl) {
      return;
    }

    const loadSignedUrl = async () => {
      setLoading(true);
      setError(null);
      setImageLoaded(false);

      for (let i = 0; i < possibleBuckets.length; i++) {
        try {
          const signedUrl = await lawyerApplicationsService.getSignedUrl(possibleBuckets[i], imagePath);
          
          // Only update if we're still loading the same path
          if (imagePath === loadedPathRef.current || !loadedPathRef.current) {
            setImageUrl(signedUrl);
            setLoading(false);
            loadedPathRef.current = imagePath;
          }
          return;
        } catch (err) {
          continue;
        }
      }

      if (imagePath === loadedPathRef.current || !loadedPathRef.current) {
        setError('Image not found in any bucket');
        setLoading(false);
        loadedPathRef.current = imagePath;
      }
    };

    loadSignedUrl();
  }, [imagePath, alt]); // Removed possibleBuckets from deps to prevent unnecessary reloads

  const handleDownload = async () => {
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${alt.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleView = () => {
    if (!imageUrl) return;
    window.open(imageUrl, '_blank');
  };

  if (!imagePath) {
    return (
      <div className="w-full h-40 rounded-md border border-dashed border-gray-300 bg-gray-50 grid place-items-center text-[10px] text-gray-500">
        No image available
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-40 rounded-md border border-gray-200 bg-gray-100 grid place-items-center text-[10px] text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto mb-1"></div>
          <p>Loading image...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-40 rounded-md border border-dashed border-gray-300 bg-gray-50 grid place-items-center text-[10px] text-gray-500">
        <div className="text-center">
          <p>Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative group">
        <img
          src={imageUrl}
          alt={alt}
          className={className}
          onError={() => setError('Failed to load image')}
          onLoad={() => setImageLoaded(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
        
        {/* Hover overlay with buttons */}
        {imageLoaded && imageUrl && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 rounded-md">
            <Tooltip content="View Full Size">
              <button
                onClick={handleView}
                className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full transition-all duration-200 hover:scale-110"
              >
                <ZoomIn size={16} className="text-gray-700" />
              </button>
            </Tooltip>
            <Tooltip content="Download">
              <button
                onClick={handleDownload}
                className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full transition-all duration-200 hover:scale-110"
              >
                <Download size={16} className="text-gray-700" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
      
      {!imageLoaded && imageUrl && (
        <div className="w-full h-40 rounded-md border border-gray-200 bg-gray-100 grid place-items-center text-[10px] text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto mb-1"></div>
            <p>Loading image...</p>
          </div>
        </div>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if imagePath actually changes
  return prevProps.imagePath === nextProps.imagePath && 
         prevProps.primaryBucket === nextProps.primaryBucket;
});

SecureImage.displayName = 'SecureImage';

export default SecureImage;
