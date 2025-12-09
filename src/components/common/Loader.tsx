const Loader = ({ className = "" }) => {
    return (
      <div className="h-screen w-full">
        <div className={`inline-flex items-center justify-center h-full w-full ${className}`}>
          <svg className="loader">
            <circle cx="70" cy="70" r="70"></circle>
          </svg>
        </div>
      </div>
      
    );
  };

  export default Loader