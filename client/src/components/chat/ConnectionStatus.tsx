import React from 'react';

interface ConnectionStatusProps {
    isConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
    return (
        <div className="fixed bottom-4 left-4 z-40 text-sm bg-white shadow-md rounded-full px-3 py-1.5 flex items-center">
            <div
                className={`w-2 h-2 rounded-full mr-2 ${
                    isConnected ? "bg-green-500" : "bg-error animate-pulse"
                }`}
            />
            <span>{isConnected ? "Connesso" : "Riconnessione in corso..."}</span>
        </div>
    );
};

export default ConnectionStatus;