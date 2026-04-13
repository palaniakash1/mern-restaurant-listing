import { Button, Modal } from 'flowbite-react';
import { HiOutlineExclamationCircle } from 'react-icons/hi2';

export default function DeleteConfirmModal({
  show,
  onClose,
  onConfirm,
  title = 'Delete',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  warning = null,
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  isLoading = false
}) {
  return (
    <Modal show={show} onClose={onClose} dismissible={true}>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col items-center gap-4 text-center">
          <HiOutlineExclamationCircle className="h-16 w-16 text-red-500" />
          <p className="text-sm text-gray-600">{message}</p>
          {warning && (
            <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg w-full">
              {warning}
            </p>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button color="failure" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Deleting...' : confirmText}
        </Button>
        <Button color="gray" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
