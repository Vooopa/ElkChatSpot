const ConnectionStatus = () => {
  return (
    <div className="fixed bottom-4 left-4 z-40 text-sm bg-white shadow-md rounded-full px-3 py-1.5 flex items-center">
      <div className="w-2 h-2 bg-error rounded-full mr-2 animate-pulse"></div>
      <span>Reconnecting...</span>
    </div>
  );
};

export default ConnectionStatus;
