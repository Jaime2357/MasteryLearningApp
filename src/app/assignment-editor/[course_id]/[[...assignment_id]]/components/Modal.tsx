
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-lg w-full max-w-3xl mx-4 p-0 outline-none"
        tabIndex={0}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="px-6 pt-6 pb-2 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-2xl text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 rounded"
            >
              &times;
            </button>
          </div>
        )}
        {/* Scrollable content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};


export default Modal;
