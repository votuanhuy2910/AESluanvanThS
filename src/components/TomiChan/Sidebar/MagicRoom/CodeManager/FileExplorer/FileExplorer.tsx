import React, { useState, useEffect } from "react";
import { IconFolderPlus, IconFilePlus, IconDots } from "@tabler/icons-react";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { chatDB } from "../../../../../../utils/db";
import type { CodeFile, CodeFolder, Project } from "../../../../../../types";
import FolderNode from "./FolderNode";
import FileItem from "./FileItem";
import NewItemInput from "./NewItemInput";
import { toast } from "sonner";
import { FILE_EXPLORER_EVENTS } from "@/lib/events";
import { emitter } from "@/lib/events";

interface FileExplorerProps {
  onFileSelect: (file: CodeFile) => void;
  activeFileId?: string;
  onFileUpdate: (file: CodeFile) => void;
  onFileDelete: (fileId: string) => void;
  className?: string;
}

export default function FileExplorer({
  onFileSelect,
  activeFileId,
  onFileUpdate,
  onFileDelete,
  className = "",
}: FileExplorerProps) {
  const [folders, setFolders] = useState<CodeFolder[]>([]);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [creatingFolderId, setCreatingFolderId] = useState<string | null>(null);
  const [creatingFileId, setCreatingFileId] = useState<string | null>(null);
  const [creatingRootFolder, setCreatingRootFolder] = useState(false);
  const [creatingRootFile, setCreatingRootFile] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const loadData = async () => {
    const allFolders = await chatDB.getAllFolders();
    const allFiles = await chatDB.getAllCodeFiles();
    const allProjects = await chatDB.getAllProjects();

    // Sắp xếp thư mục và file theo bảng chữ cái
    const sortedFolders = allFolders.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const sortedFiles = allFiles.sort((a, b) => a.name.localeCompare(b.name));

    setFolders(sortedFolders);
    setFiles(sortedFiles);
    setProjects(allProjects);

    // Mặc định mở thư mục gốc
    const rootFolders = sortedFolders.filter((f) => !f.parentId);
    setExpandedFolders(new Set(rootFolders.map((f) => f.id)));
  };

  useEffect(() => {
    loadData();

    // Lắng nghe sự kiện reload
    const handleReload = () => {
      loadData();
    };
    emitter.on(FILE_EXPLORER_EVENTS.RELOAD, handleReload);

    return () => {
      emitter.off(FILE_EXPLORER_EVENTS.RELOAD, handleReload);
    };
  }, []);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleCreateFolder = (parentId: string | null) => {
    // Nếu parentId là null, hủy việc tạo
    if (parentId === null) {
      setCreatingFolderId(null);
      setCreatingRootFolder(false);
      return;
    }

    // Reset các trạng thái tạo khác
    setCreatingFileId(null);
    setCreatingRootFile(false);

    // Mở thư mục cha nếu đang tạo thư mục con
    if (parentId !== "") {
      setExpandedFolders((prev) => {
        const newSet = new Set(prev);
        newSet.add(parentId);
        return newSet;
      });

      // Đặt ID thư mục đang tạo
      setCreatingFolderId(parentId);
      setCreatingRootFolder(false);
    } else {
      // Tạo thư mục gốc
      setCreatingFolderId(null);
      setCreatingRootFolder(true);
    }
  };

  const handleCancelCreateFolder = () => {
    setCreatingFolderId(null);
    setCreatingRootFolder(false);
  };

  const handleCreateFile = (folderId: string | null) => {
    // Nếu folderId là null, hủy việc tạo
    if (folderId === null) {
      setCreatingFileId(null);
      setCreatingRootFile(false);
      return;
    }

    // Reset các trạng thái tạo khác
    setCreatingFolderId(null);
    setCreatingRootFolder(false);

    // Mở thư mục cha nếu đang tạo file trong thư mục
    if (folderId !== "") {
      setExpandedFolders((prev) => {
        const newSet = new Set(prev);
        newSet.add(folderId);
        return newSet;
      });

      // Đặt ID thư mục chứa file đang tạo
      setCreatingFileId(folderId);
      setCreatingRootFile(false);
    } else {
      // Tạo file gốc
      setCreatingFileId(null);
      setCreatingRootFile(true);
    }
  };

  const handleCancelCreateFile = () => {
    setCreatingFileId(null);
    setCreatingRootFile(false);
  };

  const handleEditFolder = (folder: CodeFolder) => {
    chatDB
      .saveFolder({
        ...folder,
        updatedAt: new Date(),
      })
      .then(() => {
        loadData();
        emitter.emit(FILE_EXPLORER_EVENTS.RELOAD);
        toast.success("Đã đổi tên thư mục thành công!");
      })
      .catch((error) => {
        console.error("Lỗi khi lưu thư mục:", error);
        toast.error("Có lỗi khi đổi tên thư mục!");
      });
  };

  const handleDeleteFolder = (folder: CodeFolder) => {
    chatDB.deleteFolder(folder.id).then(() => {
      loadData();
      emitter.emit(FILE_EXPLORER_EVENTS.RELOAD);
      toast.success("Đã xóa thư mục thành công!");
    });
  };

  const handleEditFile = (file: CodeFile) => {
    const updatedFile = {
      ...file,
      language: file.name.split(".").pop() || "javascript",
      updatedAt: new Date(),
    };

    chatDB
      .saveCodeFile(updatedFile)
      .then(() => {
        loadData();
        onFileUpdate(updatedFile);
        emitter.emit(FILE_EXPLORER_EVENTS.RELOAD);
        toast.success("Đã đổi tên file thành công!");
      })
      .catch((error) => {
        console.error("Lỗi khi lưu file:", error);
        toast.error("Có lỗi khi đổi tên file!");
      });
  };

  const handleDeleteFile = (file: CodeFile) => {
    chatDB.deleteCodeFile(file.id).then(() => {
      loadData();
      emitter.emit(FILE_EXPLORER_EVENTS.RELOAD);
      toast.success("Đã xóa file thành công!");
    });
  };

  // Lấy thông tin file đang active và project của nó
  const activeFile = files.find((f) => f.id === activeFileId);
  const activeProject = activeFile?.projectId
    ? projects.find((p) => p.id === activeFile.projectId)
    : null;

  // Lọc các thư mục và file dựa vào project của file đang active
  const rootFolders = folders.filter((folder) => {
    if (activeFile?.projectId) {
      // Nếu đang trong project, chỉ hiển thị thư mục gốc của project đó
      return folder.projectId === activeFile.projectId && !folder.parentId;
    }
    // Nếu không trong project nào, chỉ hiển thị thư mục gốc không thuộc project nào
    return !folder.projectId && !folder.parentId;
  });

  const rootFiles = files.filter((file) => {
    if (activeFile?.projectId) {
      // Nếu đang trong project, chỉ hiển thị file gốc của project đó
      return file.projectId === activeFile.projectId && !file.folderId;
    }
    // Nếu không trong project nào, chỉ hiển thị file gốc không thuộc project nào
    return !file.projectId && !file.folderId;
  });

  return (
    <div
      className={`h-full min-w-[250px] bg-white dark:bg-gray-900 ${className}`}
    >
      <div className="p-2 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">
            {activeProject ? activeProject.name : "ROOT"}
          </h3>
          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer">
                <IconDots size={16} />
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-[9999] mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleCreateFolder("")}
                        className={`${
                          active ? "bg-gray-100 dark:bg-gray-700" : ""
                        } flex w-full items-center px-4 py-2 text-sm cursor-pointer`}
                      >
                        <IconFolderPlus size={16} className="mr-2" />
                        Tạo thư mục mới
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleCreateFile("")}
                        className={`${
                          active ? "bg-gray-100 dark:bg-gray-700" : ""
                        } flex w-full items-center px-4 py-2 text-sm cursor-pointer`}
                      >
                        <IconFilePlus size={16} className="mr-2" />
                        Tạo file mới
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto pr-2 -mr-2">
            <div className="pb-32">
              {rootFolders.length === 0 &&
                rootFiles.length === 0 &&
                !creatingRootFolder &&
                !creatingRootFile && (
                  <div className="text-gray-500 text-sm p-2">
                    Không có file hoặc thư mục nào. Hãy tạo file mới.
                  </div>
                )}

              {rootFolders.map((folder) => (
                <FolderNode
                  key={folder.id}
                  folder={folder}
                  level={0}
                  folders={folders}
                  files={files}
                  onFileSelect={onFileSelect}
                  activeFileId={activeFileId}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                  onCreateFolder={handleCreateFolder}
                  onCreateFile={handleCreateFile}
                  creatingFolderId={creatingFolderId}
                  creatingFileId={creatingFileId}
                  onEditFolder={handleEditFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onEditFile={handleEditFile}
                  onDeleteFile={handleDeleteFile}
                />
              ))}

              {creatingRootFolder && (
                <NewItemInput
                  type="folder"
                  level={0}
                  parentId=""
                  projectId={activeProject?.id}
                  onCancel={handleCancelCreateFolder}
                />
              )}

              {rootFiles.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  onClick={() => onFileSelect(file)}
                  isActive={activeFileId === file.id}
                  paddingLeft={0}
                  onEdit={(editedFile) => handleEditFile(editedFile)}
                  onDelete={() => onFileDelete(file.id)}
                />
              ))}

              {creatingRootFile && (
                <NewItemInput
                  type="file"
                  level={0}
                  parentId=""
                  projectId={activeProject?.id}
                  onCancel={handleCancelCreateFile}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
