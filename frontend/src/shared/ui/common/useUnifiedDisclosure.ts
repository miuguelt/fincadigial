import React from "react";

export const useUnifiedDisclosure = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: (open: boolean) => setIsOpen(open),
  } as const;
};

export const useDisclosure = useUnifiedDisclosure;
