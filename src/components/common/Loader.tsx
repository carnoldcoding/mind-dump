const Loader = ({ size = 40, className = "" }) => {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <svg className="loader">
          <circle cx="70" cy="70" r="70"></circle>
        </svg>
      </div>
    );
  };

  export default Loader