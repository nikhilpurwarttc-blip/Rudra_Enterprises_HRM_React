import { X } from "lucide-react";

const NotificationModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bottom-0 top-14 right-0 z-100 flex items-start justify-end">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative transition-colors md:mr-45 mr-13 w-80 dark:bg-black/50 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-200/70 dark:border-gray-700/70 overflow-hidden animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white tracking-wide">
            Notifications
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={16} className="text-gray-500 hover:text-red-500" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No new notifications
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;