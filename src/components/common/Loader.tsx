const Loader = () => {
    return (
      <div className="fixed top-0 left-0 h-screen w-full">
        <div className={`inline-flex items-center justify-center h-full w-full`}>
          <svg className="loader">
            <circle cx="70" cy="70" r="70"></circle>
          </svg>
        </div>
      </div>
      
    );
  };

  export default Loader