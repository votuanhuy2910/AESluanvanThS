/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { HTMLAttributes, useState } from "react";
import {
  IconX,
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconFolder,
  IconFolderPlus,
  IconFilePlus,
  IconLayoutGrid,
  IconLayoutList,
  IconDownload,
  IconDotsVertical,
  IconFileOff,
  IconFolderCode,
} from "@tabler/icons-react";
import { FileModal } from "./Modals/FileModal";
import CodeEditor from "./CodeEditor";
import { useCodeAssistant } from "./hooks/useCodeAssistant";
import MediaViewer from "./MediaViewer";
import FileUploadZone from "./FileUploadZone";
import FileIcon from "./FileIcon";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { setSessionStorage } from "../../../../../utils/sessionStorage";
import {
  emitter,
  FILE_EXPLORER_EVENTS,
  MAGIC_EVENTS,
} from "../../../../../lib/events";

declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    directory?: string;
    webkitdirectory?: string;
  }
}

interface CodeAssistantProps {
  onClose: () => void;
}

export default function CodeAssistant({ onClose }: CodeAssistantProps) {
  const [isGridView, setIsGridView] = React.useState(false);

  const {
    files,
    folders,
    projects,
    isNewFileModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    isNewProjectModalOpen,
    isNewFolderModalOpen,
    newFileName,
    newProjectName,
    newProjectDescription,
    selectedFile,
    activeFile,
    selectedFolder,
    selectedProject,
    selectedParentFolder,
    currentFolder,
    currentProject,
    setIsNewFileModalOpen,
    setIsEditModalOpen,
    setIsDeleteModalOpen,
    setIsNewProjectModalOpen,
    setIsNewFolderModalOpen,
    setNewFileName,
    setNewProjectName,
    setNewProjectDescription,
    setSelectedFile,
    setSelectedFolder,
    setSelectedProject,
    setSelectedParentFolder,
    createNewFile,
    createNewFolder,
    createNewProject,
    handleEditFile,
    handleDeleteFile,
    handleEditFolder,
    handleDeleteFolder,
    handleEditProject,
    handleDeleteProject,
    handleFileOpen,
    handleEditorBack,
    handleFolderClick,
    handleProjectClick,
    handlePathClick,
    openEditFolderModal,
    openDeleteFolderModal,
    getCurrentPath,
    loadFiles,
    loadFolders,
    loadProjects,
    setCurrentProject,
    setCurrentFolder,
    isDeleting,
  } = useCodeAssistant();

  // Thêm useEffect để gán ui_state khi khởi tạo
  React.useEffect(() => {
    // Lắng nghe event để quay về magic room
    const handleBackToMagicRoom = () => {
      setSessionStorage("ui_state_magic", "magic_room");
      onClose();
    };

    emitter.on(MAGIC_EVENTS.BACK_TO_MAGIC_ROOM, handleBackToMagicRoom);

    return () => {
      emitter.off(MAGIC_EVENTS.BACK_TO_MAGIC_ROOM, handleBackToMagicRoom);
    };
  }, [onClose]);

  // Giữ nguyên useEffect cho việc reload files
  React.useEffect(() => {
    const handleReload = async () => {
      await loadFiles();
      await loadFolders();
    };

    emitter.on(FILE_EXPLORER_EVENTS.RELOAD, handleReload);

    return () => {
      emitter.off(FILE_EXPLORER_EVENTS.RELOAD, handleReload);
    };
  }, [loadFiles, loadFolders]);

  // Thêm useEffect để theo dõi thay đổi của media_file_name
  React.useEffect(() => {
    const handleOpenMedia = ({
      fileName,
      projectId,
    }: {
      fileName: string;
      projectId?: string;
    }) => {
      // Tìm file cần mở, ưu tiên file trong project nếu có projectId
      const targetFile = files.find((f) => {
        if (projectId) {
          return f.name === fileName && f.projectId === projectId;
        }
        return f.name === fileName;
      });

      if (targetFile) {
        handleFileOpen(targetFile);
      }
    };

    emitter.on(MAGIC_EVENTS.OPEN_MEDIA, handleOpenMedia);

    return () => {
      emitter.off(MAGIC_EVENTS.OPEN_MEDIA, handleOpenMedia);
    };
  }, [files, handleFileOpen]);

  // Sửa lại useEffect để xử lý đường dẫn file chính xác hơn
  React.useEffect(() => {
    const handleOpenCodeFile = async ({ filePath }: { filePath: string }) => {
      try {
        // Tìm file theo đường dẫn đầy đủ
        const pathParts = filePath.split("/");
        const fileName = pathParts.pop() || filePath;

        // Tìm file và folder phù hợp
        let currentFolderId: string | null = null;
        let folderPath = "";

        // Duyệt qua từng phần của đường dẫn để tìm folder
        for (const folderName of pathParts) {
          if (!folderName) continue;
          folderPath += (folderPath ? "/" : "") + folderName;

          // Tìm folder con trong folder hiện tại
          const matchingFolders = folders.filter(
            (f) =>
              f.name === folderName &&
              ((!currentFolderId && !f.parentId) ||
                f.parentId === currentFolderId)
          );

          if (matchingFolders.length > 0) {
            currentFolderId = matchingFolders[0].id;
          } else {
            console.warn(`Không tìm thấy thư mục: ${folderPath}`);
            currentFolderId = null;
            break;
          }
        }

        // Tìm file trong folder đã xác định
        let targetFile = null;
        if (currentFolderId) {
          targetFile = files.find(
            (f) => f.name === fileName && f.folderId === currentFolderId
          );
        }

        // Nếu không tìm thấy file trong folder, thử tìm theo tên
        if (!targetFile) {
          targetFile = files.find((f) => f.name === fileName);
        }

        if (targetFile) {
          handleFileOpen(targetFile);
        } else {
          console.warn(
            `Không tìm thấy file: ${fileName} (đường dẫn: ${filePath})`
          );
        }
      } catch (error) {
        console.error("Lỗi khi mở file:", error);
      }
    };

    emitter.on(MAGIC_EVENTS.OPEN_CODE_FILE, handleOpenCodeFile);

    return () => {
      emitter.off(MAGIC_EVENTS.OPEN_CODE_FILE, handleOpenCodeFile);
    };
  }, [files, folders, handleFileOpen]);

  const downloadFile = (file: any) => {
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    saveAs(blob, file.name);
  };

  const downloadFolder = async (folderId: string) => {
    const zip = new JSZip();

    // Hàm đệ quy để thêm files và folders vào zip
    const addToZip = async (currentFolderId: string, path: string = "") => {
      // Thêm files trong folder hiện tại
      const filesInFolder = files.filter(
        (file) => file.folderId === currentFolderId
      );
      filesInFolder.forEach((file) => {
        zip.file(`${path}${file.name}`, file.content);
      });

      // Thêm subfolders và files của chúng
      const subFolders = folders.filter(
        (folder) => folder.parentId === currentFolderId
      );
      for (const subFolder of subFolders) {
        await addToZip(subFolder.id, `${path}${subFolder.name}/`);
      }
    };

    // Lấy thông tin folder hiện tại
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    await addToZip(folderId);

    // Tạo và tải xuống file zip
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${folder.name}.zip`);
  };

  const renderFolderContents = (folderId: string | null) => {
    const foldersInCurrent = folders.filter((folder) => {
      if (currentProject) {
        if (!currentFolder) {
          // Nếu đang trong project và chưa vào thư mục con nào
          // Chỉ lấy các thư mục trực tiếp của project (không có parentId hoặc parentId là null)
          return (
            folder.projectId === currentProject &&
            (!folder.parentId || folder.parentId === null)
          );
        } else {
          // Nếu đang trong một thư mục con của project
          // Lấy các thư mục con của thư mục hiện tại
          return (
            folder.projectId === currentProject &&
            folder.parentId === currentFolder
          );
        }
      } else {
        // Nếu đang ở root, lấy folders không thuộc project nào
        return !folder.projectId && folder.parentId === folderId;
      }
    });

    const filesInCurrent = files.filter((file) => {
      if (currentProject) {
        if (!currentFolder) {
          // Nếu đang trong project và chưa vào thư mục con nào
          // Chỉ lấy các file trực tiếp của project (không có folderId hoặc folderId là null)
          return (
            file.projectId === currentProject &&
            (!file.folderId || file.folderId === null)
          );
        } else {
          // Nếu đang trong một thư mục con của project
          // Lấy các file của thư mục hiện tại
          return (
            file.projectId === currentProject && file.folderId === currentFolder
          );
        }
      } else {
        // Nếu đang ở root, lấy files không thuộc project nào
        return !file.projectId && file.folderId === folderId;
      }
    });

    // Kiểm tra nếu không có thư mục và file nào
    if (foldersInCurrent.length === 0 && filesInCurrent.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
          <IconFileOff size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">
            Không có tệp hoặc thư mục nào
          </p>
          <p className="text-sm text-center max-w-md">
            Tạo tệp mới, tạo thư mục hoặc kéo thả tệp vào đây để bắt đầu.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2">
        {foldersInCurrent.map((folder) => (
          <div
            key={folder.id}
            className={`${
              isGridView
                ? "p-4 border rounded-lg border-gray-200 dark:border-gray-800"
                : "p-2"
            } hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer group relative`}
            onClick={() => handleFolderClick(folder.id)}
          >
            <div className="flex items-center flex-1">
              <IconFolder size={20} className="mr-2 text-yellow-500" />
              <span className="flex-1 truncate">{folder.name}</span>
              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:opacity-100">
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconDotsVertical size={18} />
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
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFolder(folder.id);
                              }}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm`}
                            >
                              <IconDownload size={16} className="mr-2" />
                              Tải xuống
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => openEditFolderModal(folder, e)}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm`}
                            >
                              <IconEdit size={16} className="mr-2" />
                              Đổi tên
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => openDeleteFolderModal(folder, e)}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm text-red-500`}
                            >
                              <IconTrash size={16} className="mr-2" />
                              Xóa
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>
        ))}

        {filesInCurrent.map((file) => (
          <div
            key={file.id}
            className={`${
              isGridView
                ? "p-4 border rounded-lg border-gray-200 dark:border-gray-800"
                : "p-3 flex items-center"
            } hover:bg-gray-50 dark:hover:bg-gray-900 group cursor-pointer relative`}
            onClick={() => handleFileOpen(file)}
          >
            <div className={`${isGridView ? "" : "flex-1"} flex items-center`}>
              <FileIcon fileName={file.name} />
              <span className="flex-1 truncate">{file.name}</span>
              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:opacity-100">
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconDotsVertical size={18} />
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
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file);
                              }}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm`}
                            >
                              <IconDownload size={16} className="mr-2" />
                              Tải xuống
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setNewFileName(file.name);
                                setIsEditModalOpen(true);
                              }}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm`}
                            >
                              <IconEdit size={16} className="mr-2" />
                              Đổi tên
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setIsDeleteModalOpen(true);
                              }}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm text-red-500`}
                            >
                              <IconTrash size={16} className="mr-2" />
                              Xóa
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProjectList = () => {
    const rootFolders = folders.filter(
      (f) => !f.projectId && (!f.parentId || f.parentId === null)
    );
    const rootFiles = files.filter(
      (f) => !f.projectId && (!f.folderId || f.folderId === null)
    );

    if (
      projects.length === 0 &&
      rootFolders.length === 0 &&
      rootFiles.length === 0
    ) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
          <IconFolderCode size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Chưa có dự án nào</p>
          <p className="text-sm text-center max-w-md">
            Tạo dự án mới để bắt đầu quản lý mã nguồn của bạn.
          </p>
        </div>
      );
    }

    return (
      <div
        className={`${
          isGridView ? "grid grid-cols-2 md:grid-cols-3 gap-4" : "space-y-2"
        }`}
      >
        {projects.map((project) => (
          <div
            key={project.id}
            className={`${
              isGridView
                ? "p-4 border rounded-lg border-gray-200 dark:border-gray-800"
                : "p-2"
            } hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer group relative ${
              currentProject === project.id
                ? "bg-gray-100 dark:bg-gray-800"
                : ""
            }`}
            onClick={() => handleProjectClick(project.id)}
          >
            <div className="flex items-center flex-1">
              <IconFolderCode size={20} className="mr-2 text-blue-500" />
              <div className="flex-1">
                <span className="block truncate font-medium">
                  {project.name}
                </span>
                {project.description && (
                  <span className="block text-sm text-gray-500 dark:text-gray-400 truncate">
                    {project.description}
                  </span>
                )}
              </div>
              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:opacity-100">
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconDotsVertical size={18} />
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
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(project);
                                setNewProjectName(project.name);
                                setNewProjectDescription(
                                  project.description || ""
                                );
                                setIsEditModalOpen(true);
                              }}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm`}
                            >
                              <IconEdit size={16} className="mr-2" />
                              Đổi tên
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(project);
                                setIsDeleteModalOpen(true);
                              }}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm text-red-500`}
                            >
                              <IconTrash size={16} className="mr-2" />
                              Xóa
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>
        ))}

        {rootFolders.map((folder) => (
          <div
            key={folder.id}
            className={`${
              isGridView
                ? "p-4 border rounded-lg border-gray-200 dark:border-gray-800"
                : "p-2"
            } hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer group relative`}
            onClick={() => handleFolderClick(folder.id)}
          >
            <div className="flex items-center flex-1">
              <IconFolder size={20} className="mr-2 text-yellow-500" />
              <span className="flex-1 truncate">{folder.name}</span>
              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:opacity-100">
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconDotsVertical size={18} />
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
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => openEditFolderModal(folder, e)}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm`}
                            >
                              <IconEdit size={16} className="mr-2" />
                              Đổi tên
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => openDeleteFolderModal(folder, e)}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm text-red-500`}
                            >
                              <IconTrash size={16} className="mr-2" />
                              Xóa
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>
        ))}

        {rootFiles.map((file) => (
          <div
            key={file.id}
            className={`${
              isGridView
                ? "p-4 border rounded-lg border-gray-200 dark:border-gray-800"
                : "p-3 flex items-center"
            } hover:bg-gray-50 dark:hover:bg-gray-900 group cursor-pointer relative`}
            onClick={() => handleFileOpen(file)}
          >
            <div className={`${isGridView ? "" : "flex-1"} flex items-center`}>
              <FileIcon fileName={file.name} />
              <span className="flex-1 truncate">{file.name}</span>
              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:opacity-100">
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconDotsVertical size={18} />
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
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setNewFileName(file.name);
                                setIsEditModalOpen(true);
                              }}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm`}
                            >
                              <IconEdit size={16} className="mr-2" />
                              Đổi tên
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setIsDeleteModalOpen(true);
                              }}
                              className={`${
                                active ? "bg-gray-100 dark:bg-gray-700" : ""
                              } flex w-full items-center px-4 py-2 text-sm text-red-500`}
                            >
                              <IconTrash size={16} className="mr-2" />
                              Xóa
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isMediaFile = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "mp3",
      "wav",
      "ogg",
      "aac",
      "mp4",
      "webm",
      "ogv",
      "mov",
      "pdf",
    ].includes(extension || "");
  };

  return (
    <div className="flex flex-col h-full">
      {activeFile ? (
        isMediaFile(activeFile.name) ? (
          <MediaViewer
            file={activeFile}
            onClose={onClose}
            onBack={handleEditorBack}
          />
        ) : (
          <CodeEditor
            file={activeFile}
            onClose={onClose}
            onBack={handleEditorBack}
            onFileOpen={handleFileOpen}
          />
        )
      ) : (
        <>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors cursor-pointer"
                >
                  <IconArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">
                  Quản Lý Mã Nguồn
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors cursor-pointer"
              >
                <IconX size={24} />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setIsGridView(!isGridView)}
                className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded transition-colors cursor-pointer"
                title={isGridView ? "Chế độ danh sách" : "Chế độ lưới"}
              >
                {isGridView ? (
                  <IconLayoutList size={20} className="mr-2" />
                ) : (
                  <IconLayoutGrid size={20} className="mr-2" />
                )}
                <span className="hidden sm:inline">
                  {isGridView ? "Danh sách" : "Lưới"}
                </span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer"
                  title="Tạo dự án mới"
                >
                  <IconFolderCode size={20} className="mr-1" />
                  <span className="hidden sm:inline">Dự án mới</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedParentFolder(currentFolder);
                    setIsNewFolderModalOpen(true);
                  }}
                  className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer"
                  title="Tạo thư mục mới"
                >
                  <IconFolderPlus size={20} className="mr-1" />
                  <span className="hidden sm:inline">Thư mục</span>
                </button>
                <div className="flex items-center">
                  <FileUploadZone
                    currentFolder={currentFolder}
                    createNewFile={createNewFile}
                    createNewFolder={createNewFolder}
                    isMediaFile={isMediaFile}
                  />
                </div>
                <button
                  onClick={() => {
                    setSelectedParentFolder(currentFolder);
                    setIsNewFileModalOpen(true);
                  }}
                  className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer"
                  title="Tạo tệp mới"
                >
                  <IconFilePlus size={20} className="mr-1" />
                  <span className="hidden sm:inline">Tệp mới</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation path */}
          {(currentProject || currentFolder) && (
            <div className="flex items-center p-4 gap-2 text-sm text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => {
                  setCurrentProject(null);
                  setCurrentFolder(null);
                }}
                className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
              >
                {currentProject ? "Dự án" : "Thư mục gốc"}
              </button>
              {currentProject && (
                <>
                  <span className="text-gray-400">\</span>
                  <button
                    onClick={() => handlePathClick(null)}
                    className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                  >
                    {projects.find((p) => p.id === currentProject)?.name}
                  </button>
                </>
              )}
              {currentFolder && folders.find((f) => f.id === currentFolder) && (
                <>
                  {getCurrentPath()
                    .split(" / ")
                    .map((name, index, array) => {
                      const folder = folders.find((f) => f.name === name);
                      return (
                        <React.Fragment key={folder?.id || index}>
                          <span className="text-gray-400">\</span>
                          <button
                            onClick={() => handlePathClick(folder?.id || null)}
                            className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                          >
                            {name}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </>
              )}
            </div>
          )}

          {/* Main Content */}
          <FileUploadZone
            currentFolder={currentFolder}
            createNewFile={createNewFile}
            createNewFolder={createNewFolder}
            isMediaFile={isMediaFile}
            className="flex-1 overflow-y-auto p-4 relative"
          >
            {currentProject || currentFolder ? (
              <div
                className={`${
                  isGridView
                    ? "grid grid-cols-2 md:grid-cols-3 gap-4"
                    : "space-y-2"
                }`}
              >
                {renderFolderContents(currentFolder)}
              </div>
            ) : (
              renderProjectList()
            )}
          </FileUploadZone>

          {/* Modals */}
          <FileModal
            type={
              isNewProjectModalOpen
                ? "newProject"
                : isNewFolderModalOpen
                ? "newFolder"
                : isNewFileModalOpen
                ? "new"
                : isEditModalOpen
                ? "edit"
                : "delete"
            }
            isOpen={
              isNewFileModalOpen ||
              isEditModalOpen ||
              isDeleteModalOpen ||
              isNewFolderModalOpen ||
              isNewProjectModalOpen
            }
            onClose={() => {
              setIsNewFileModalOpen(false);
              setIsEditModalOpen(false);
              setIsDeleteModalOpen(false);
              setIsNewFolderModalOpen(false);
              setIsNewProjectModalOpen(false);
              setNewFileName("");
              setNewProjectName("");
              setNewProjectDescription("");
              setSelectedFile(null);
              setSelectedFolder(null);
              setSelectedProject(null);
            }}
            fileName={newFileName}
            projectName={newProjectName}
            projectDescription={newProjectDescription}
            onFileNameChange={setNewFileName}
            onProjectNameChange={setNewProjectName}
            onProjectDescriptionChange={setNewProjectDescription}
            onSubmit={() => {
              if (isNewProjectModalOpen) {
                createNewProject();
              } else if (isNewFileModalOpen) {
                createNewFile();
              } else if (isNewFolderModalOpen) {
                createNewFolder();
              } else if (isEditModalOpen) {
                if (selectedProject) {
                  handleEditProject();
                } else if (selectedFolder) {
                  handleEditFolder();
                } else {
                  handleEditFile();
                }
              } else if (isDeleteModalOpen) {
                if (selectedProject) {
                  handleDeleteProject();
                } else if (selectedFolder) {
                  handleDeleteFolder();
                } else {
                  handleDeleteFile();
                }
              }
            }}
            selectedFile={selectedFile || undefined}
            selectedFolder={selectedFolder}
            selectedProject={selectedProject}
            folders={folders}
            selectedParentFolder={selectedParentFolder}
            onParentFolderChange={setSelectedParentFolder}
            isDeleting={isDeleting}
          />
        </>
      )}
    </div>
  );
}
