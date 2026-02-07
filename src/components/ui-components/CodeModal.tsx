"use client";
import { useState } from "react";
import { Modal, ModalBody, ModalHeader, Tooltip } from "flowbite-react";
import { IconCode } from "@tabler/icons-react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const CodeModal = ({ children }: any) => {
  const [openModal, setOpenModal] = useState(false);

  const handleOpenModal = () => {
    setOpenModal(!openModal);
  };
  return (
    <div>
      <Tooltip content="Show Code" trigger="hover" className="whitespace-nowrap">
        <div className="group hover:bg-lightprimary hover:cursor-pointer p-2 rounded-full">
          <IconCode size={18} onClick={handleOpenModal} className="group-hover:text-primary" />
        </div>
      </Tooltip>
      <Modal show={openModal} onClose={handleOpenModal}>
        <ModalHeader className="rounded-t-md border-b border-ld">
          Sample Code
        </ModalHeader>

        <ModalBody className="overflow-y-auto code-modal">
          <SyntaxHighlighter language="javascript" style={docco}>{children}</SyntaxHighlighter>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default CodeModal;
