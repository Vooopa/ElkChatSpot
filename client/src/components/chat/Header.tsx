interface HeaderProps {
  roomInfo: string;
  onlineCount: number;
}

const Header = ({ roomInfo, onlineCount }: HeaderProps) => {
  return (
      <header className="bg-white border-b border-gray-200 shadow-sm py-3 px-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Chat Room</h1>
            <p className="text-sm text-gray-500">
              <span className="font-medium">{roomInfo}</span>
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-accent rounded-full mr-1.5"></div>
              <span className="text-sm text-gray-600">{onlineCount} online</span>
            </div>
          </div>
        </div>
      </header>
  );
};

export default Header;