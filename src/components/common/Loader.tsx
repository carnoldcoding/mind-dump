const Loader = ({ size = 40, className = "" }) => {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <div 
          className="animate-spin rounded-full border-4 border-solid"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderColor: '#98977B', 
            borderTopColor: '#C6C2A5', 
            borderRightColor: '#DBD5B3',
            borderBottomColor: '#A9A38B',
          }}
        />
      </div>
    );
  };

  export default Loader