import { useState, useEffect } from "react";

export const SiteIntroAnimation = ({ onComplete, children } : {onComplete: any, children:any}) => {
    const [displayText, setDisplayText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const fullText = '▪ synthetic ∴ soul ▪';
    
    useEffect(() => {
      let index = 0;
      const typeInterval = setInterval(() => {
        if (index <= fullText.length) {
          setDisplayText(fullText.slice(0, index));
          index++;
        } else {
          clearInterval(typeInterval);
          // Wait a moment then fade out and complete
          setTimeout(() => {
            setIsComplete(true);
            setTimeout(() => {
              onComplete?.();
            }, 500); // Fade out duration
          }, 1000); // Pause before fade
        }
      }, 100); // Typing speed
  
      return () => clearInterval(typeInterval);
    }, [onComplete]);
  
    if (isComplete) {
      return (
        <div className="animate-fade-in">
          {children}
        </div>
      );
    }
  
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-500"
        style={{ backgroundColor: '#48483D' }}
      >
        <div className="text-center">
          <h1 
            className="text-3xl md:text-5xl lg:text-6xl font-mono tracking-wider"
            style={{ 
              color: '#C4BEAC',
              fontFamily: 'Baloo Bhaijaan 2, monospace'
            }}
          >
            {displayText}
            {displayText.length < fullText.length && (
              <span 
                className="animate-pulse ml-1"
                style={{ color: '#A9A38B' }}
              >
                |
              </span>
            )}
          </h1>
        </div>
      </div>
    );
  };
  