import PageHeader from "./PageHeader"

export const UnderConstruction = ({ message = "Missing Package" }) => {
    return (
        <>
        <PageHeader name="404: NOT FOUND"/>
        <div className="flex flex-col items-center justify-center min-h-64 p-8 text-center">
        
  
        {/* Main message */}
        <h3 
          className="text-xl md:text-2xl font-mono mb-3"
          style={{ color: '#6b6450' }}
        >
          {message}
        </h3>
  
        {/* Status text */}
        <p 
          className="text-sm md:text-base font-mono opacity-75"
          style={{ color: '#535242' }}
        >
          // initialization pending //
        </p>

        {/* Animated dots */}
        <div className="flex gap-2 mt-6">
                {[0, 1, 2].map((i) => (
                    <div
                    key={i}
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ 
                        backgroundColor: '#6d6958',
                        animationDelay: `${i * 0.3}s`,
                        animationDuration: '1.5s'
                    }}
                    />
                ))}
              </div>
      </div>
        </>
    );
  };
