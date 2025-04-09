/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { chatDB } from "../../../../../../../utils/db";
import type { CodeFile } from "../../../../../../../types";
import { useCodeAssistant } from "../../hooks/useCodeAssistant";
import { useOpenedFiles } from "../../hooks/useOpenedFiles";
import { emitter, MAGIC_EVENTS } from "../../../../../../../lib/events";
import { FILE_EXPLORER_EVENTS } from "../../../../../../../lib/events";

export function useEditorContent(file: CodeFile) {
  const [content, setContent] = useState(file.content);
  const [originalContent, setOriginalContent] = useState(file.content);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef(file.content);
  const originalContentRef = useRef(file.content);
  const isUpdatingFromEditorRef = useRef(false);

  // Lấy hàm loadFiles từ useCodeAssistant để cập nhật danh sách file
  const { loadFiles } = useCodeAssistant();

  // Sử dụng hook useOpenedFiles để quản lý các file đã mở
  const {
    openedFiles,
    activeFileId,
    openFile,
    closeFile,
    setActiveFileId,
    updateFileContent,
    updateOpenedFile,
    removeOpenedFile,
  } = useOpenedFiles();

  // Chỉ mở file ban đầu và file mới một lần
  const initializedRef = useRef(false);
  useEffect(() => {
    // Kiểm tra xem component mới mount hay file mới được truyền vào
    if (!initializedRef.current) {
      // Lần đầu mount, chỉ mở file ban đầu
      openFile(file);
      initializedRef.current = true;
    } else if (file && file.id && !openedFiles.some((f) => f.id === file.id)) {
      // Nếu nhận file mới và chưa có trong danh sách, mở file đó
      openFile(file);
    } else if (file && file.id) {
      // Nếu file đã có trong danh sách, chỉ active nó
      setActiveFileId(file.id);
    }
  }, [file.id]);

  useEffect(() => {
    if (activeFileId) {
      // Nếu đang cập nhật từ editor, bỏ qua việc tải lại nội dung
      if (isUpdatingFromEditorRef.current) {
        return;
      }

      // Tìm file trong danh sách đã mở
      const openedFile = openedFiles.find((f) => f.id === activeFileId);

      if (openedFile) {
        // Nếu đã có nội dung trong danh sách đã mở, sử dụng ngay
        setContent(openedFile.content);
        setOriginalContent(openedFile.content);
        contentRef.current = openedFile.content;
        originalContentRef.current = openedFile.content;
      } else {
        // Nếu không có, tải từ database
        const loadFileContent = async () => {
          try {
            const loadedFile = await chatDB.getCodeFile(activeFileId);
            if (loadedFile) {
              setContent(loadedFile.content);
              setOriginalContent(loadedFile.content);
              contentRef.current = loadedFile.content;
              originalContentRef.current = loadedFile.content;
            }
          } catch (error) {
            console.error("Lỗi khi tải nội dung file:", error);
            toast.error("Không thể tải nội dung file!");
          }
        };
        loadFileContent();
      }
    }
  }, [activeFileId, openedFiles]);

  // Kiểm tra thay đổi chưa lưu - chỉ khi không đang cập nhật từ editor
  useEffect(() => {
    if (isUpdatingFromEditorRef.current) {
      return;
    }

    // So sánh nội dung hiện tại với nội dung gốc để xác định có thay đổi chưa lưu không
    const hasChanges = content !== originalContent;
    setHasUnsavedChanges(hasChanges);
    contentRef.current = content;
  }, [content, originalContent]);

  useEffect(() => {
    originalContentRef.current = originalContent;
  }, [originalContent]);

  const handleSave = async (isAutoSave = false) => {
    setIsSaving(true);
    try {
      // Lấy file hiện tại từ activeFileId
      const currentFileId = activeFileId || file.id;
      let fileToUpdate = file;

      // Nếu activeFileId khác với file.id, tìm file đúng để cập nhật
      if (currentFileId !== file.id) {
        const currentFile = await chatDB.getCodeFile(currentFileId);
        if (currentFile) {
          fileToUpdate = currentFile;
        }
      }

      const updatedFile: CodeFile = {
        ...fileToUpdate,
        content: contentRef.current,
        updatedAt: new Date(),
      };

      await chatDB.saveCodeFile(updatedFile);

      // Cập nhật nội dung gốc sau khi lưu
      setOriginalContent(contentRef.current);
      originalContentRef.current = contentRef.current;

      // Đặt trạng thái không có thay đổi chưa lưu
      setHasUnsavedChanges(false);

      // Cập nhật danh sách file
      await loadFiles();

      if (!isAutoSave) {
        toast.success("Đã lưu file thành công!");
      }
    } catch (error) {
      console.error("Lỗi khi lưu file:", error);
      if (!isAutoSave) {
        toast.error("Lỗi khi lưu file!");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditorChange = (value: string | undefined, settings: any) => {
    const newContent = value || "";
    isUpdatingFromEditorRef.current = true;

    setContent(newContent);
    contentRef.current = newContent;

    const hasChanges = newContent !== originalContentRef.current;
    setHasUnsavedChanges(hasChanges);

    if (activeFileId) {
      updateFileContent(activeFileId, newContent);

      // Thay thế CustomEvent bằng emitter
      emitter.emit(MAGIC_EVENTS.FILE_CONTENT_CHANGED, {
        fileId: activeFileId,
        content: newContent,
      });
    }

    // Xử lý tự động lưu
    if (settings && settings.autoSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        // Kiểm tra lại một lần nữa trước khi lưu
        if (contentRef.current !== originalContentRef.current) {
          handleSave(true);
        }
      }, 2000);
    }

    // Đặt lại cờ sau một khoảng thời gian ngắn
    setTimeout(() => {
      isUpdatingFromEditorRef.current = false;
    }, 100);
  };

  // Cập nhật useEffect để sử dụng emitter
  useEffect(() => {
    const handleFileContentUpdated = ({
      fileId,
      fileName,
      content: updatedContent,
    }: {
      fileId: string;
      fileName: string;
      content: string;
    }) => {
      if (activeFileId === fileId) {
        isUpdatingFromEditorRef.current = true;

        setContent(updatedContent);
        setOriginalContent(updatedContent);
        contentRef.current = updatedContent;
        originalContentRef.current = updatedContent;
        setHasUnsavedChanges(false);
        updateFileContent(fileId, updatedContent);

        toast.success(`Đã cập nhật nội dung file: ${fileName || fileId}`);

        setTimeout(() => {
          isUpdatingFromEditorRef.current = false;
        }, 100);
      } else {
        toast.success(`Đã cập nhật nội dung file: ${fileName || fileId}`);

        const openedFileIndex = openedFiles.findIndex((f) => f.id === fileId);
        if (openedFileIndex !== -1) {
          updateFileContent(fileId, updatedContent);
        }
      }
    };

    // Đăng ký lắng nghe sự kiện qua emitter
    emitter.on(MAGIC_EVENTS.FILE_CONTENT_UPDATED, handleFileContentUpdated);

    // Cleanup
    return () => {
      emitter.off(MAGIC_EVENTS.FILE_CONTENT_UPDATED, handleFileContentUpdated);
    };
  }, [activeFileId, updateFileContent, openedFiles]);

  // Thêm useEffect để lắng nghe sự kiện reload từ FileExplorer
  useEffect(() => {
    const handleFileExplorerReload = async () => {
      // Lấy danh sách file mới nhất từ database
      const allFiles = await chatDB.getAllCodeFiles();

      // Cập nhật các file đang mở nếu có thay đổi (đổi tên, nội dung)
      for (const openedFile of openedFiles) {
        const updatedFile = allFiles.find((f) => f.id === openedFile.id);

        // Nếu file không còn tồn tại trong database (đã bị xóa)
        if (!updatedFile) {
          // Xóa file khỏi danh sách đang mở
          removeOpenedFile(openedFile.id);
          continue;
        }

        // Nếu file đã được cập nhật (tên hoặc nội dung)
        if (
          updatedFile.name !== openedFile.name ||
          updatedFile.content !== openedFile.content
        ) {
          // Cập nhật file trong danh sách đang mở
          updateOpenedFile(updatedFile);

          // Nếu đây là file đang active, cập nhật nội dung hiển thị
          if (activeFileId === updatedFile.id) {
            setContent(updatedFile.content);
            setOriginalContent(updatedFile.content);
            contentRef.current = updatedFile.content;
            originalContentRef.current = updatedFile.content;
          }
        }
      }
    };

    // Đăng ký lắng nghe sự kiện reload
    emitter.on(FILE_EXPLORER_EVENTS.RELOAD, handleFileExplorerReload);

    // Cleanup
    return () => {
      emitter.off(FILE_EXPLORER_EVENTS.RELOAD, handleFileExplorerReload);
    };
  }, [openedFiles, activeFileId, updateOpenedFile, removeOpenedFile]);

  return {
    content,
    setContent,
    originalContent,
    setOriginalContent,
    isSaving,
    hasUnsavedChanges,
    showUnsavedModal,
    setShowUnsavedModal,
    handleSave,
    handleEditorChange,
    openedFiles,
    activeFileId,
    openFile,
    closeFile,
    setActiveFileId,
    updateOpenedFile,
    removeOpenedFile,
  };
}
