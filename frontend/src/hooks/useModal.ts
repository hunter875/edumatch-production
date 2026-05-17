import { useState, useCallback } from 'react';
import { ModalProps } from '@/types';

interface UseModalReturn extends Pick<ModalProps, 'isOpen' | 'onClose'> {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useModal = (initialState = false): UseModalReturn => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    onClose: close,
    open,
    close,
    toggle,
  };
};