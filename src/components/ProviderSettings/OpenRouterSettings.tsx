import React, { useState, useEffect } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import ModalWrapper from "./ModalWrapper";
import { getLocalStorage, setLocalStorage } from "../../utils/localStorage";

interface OpenRouterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OpenRouterSettings({
  isOpen,
  onClose,
}: OpenRouterSettingsProps) {
  const [apiKey, setApiKey] = useState(() =>
    getLocalStorage("openrouter_api_key", "")
  );
  const [model, setModel] = useState(() =>
    getLocalStorage("openrouter_model", "deepseek/deepseek-r1:free")
  );
  const [systemPrompt, setSystemPrompt] = useState(() =>
    getLocalStorage(
      "openrouter_system_prompt",
      "Bạn là 1 Chat Bot AI tên là TomiChan được phát triển bởi TomiSakae!"
    )
  );
  const [temperature, setTemperature] = useState(() =>
    Number(getLocalStorage("openrouter_temperature", "0.7"))
  );
  const [maxTokens, setMaxTokens] = useState(() =>
    Number(getLocalStorage("openrouter_max_tokens", "4096"))
  );
  const [topP, setTopP] = useState(() =>
    Number(getLocalStorage("openrouter_top_p", "0.95"))
  );
  const [topK, setTopK] = useState(() =>
    Number(getLocalStorage("openrouter_top_k", "40"))
  );

  // Các trạng thái collapse cho nhóm các model
  const [isGoogleOpen, setIsGoogleOpen] = useState(false);
  const [isDeepSeekOpen, setIsDeepSeekOpen] = useState(false);
  const [isQwenOpen, setIsQwenOpen] = useState(false);
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [isMistralOpen, setIsMistralOpen] = useState(false);
  const [isOthersOpen, setIsOthersOpen] = useState(false);

  // Thêm state cho nhóm OlympicCoder
  const [isOlympicCoderOpen, setIsOlympicCoderOpen] = useState(false);

  // Định nghĩa option theo nhóm
  const groupGoogleOptions = [
    { value: "google/gemma-3-1b-it:free", label: "Gemma 3 1B" },
    { value: "google/gemma-3-4b-it:free", label: "Gemma 3 4B" },
    { value: "google/gemma-3-12b-it:free", label: "Gemma 3 12B" },
    { value: "google/gemma-3-27b-it:free", label: "Gemma 3 27B" },
    {
      value: "google/gemini-2.0-flash-lite-preview-02-05:free",
      label: "Gemini Flash Lite 2.0 Preview",
    },
    {
      value: "google/gemini-2.0-pro-exp-02-05:free",
      label: "Gemini Pro 2.0 Experimental",
    },
    {
      value: "google/gemini-2.0-flash-thinking-exp:free",
      label: "Gemini 2.0 Flash Thinking Experimental",
    },
    {
      value: "google/gemini-2.0-flash-exp:free",
      label: "Gemini Flash 2.0 Experimental",
    },
    {
      value: "google/gemini-2.0-flash-thinking-exp-1219:free",
      label: "Gemini 2.0 Flash Thinking Experimental",
    },
    { value: "google/gemini-exp-1206:free", label: "Gemini Experimental 1206" },
    { value: "google/gemma-2-9b-it:free", label: "Gemma 2 9B" },
    {
      value: "google/learnlm-1.5-pro-experimental:free",
      label: "LearnLM 1.5 Pro Experimental",
    },
    {
      value: "google/gemini-flash-1.5-8b-exp",
      label: "Gemini Flash 1.5 8B Experimental",
    },
  ];

  const groupDeepSeekOptions = [
    { value: "deepseek/deepseek-r1-zero:free", label: "DeepSeek R1 Zero" },
    {
      value: "deepseek/deepseek-r1-distill-qwen-32b:free",
      label: "R1 Distill Qwen 32B",
    },
    {
      value: "deepseek/deepseek-r1-distill-qwen-14b:free",
      label: "R1 Distill Qwen 14B",
    },
    {
      value: "deepseek/deepseek-r1-distill-llama-70b:free",
      label: "R1 Distill Llama 70B",
    },
    { value: "deepseek/deepseek-r1:free", label: "DeepSeek R1" },
    { value: "deepseek/deepseek-chat:free", label: "DeepSeek V3" },
  ];

  const groupQwenOptions = [
    { value: "qwen/qwq-32b:free", label: "QwQ 32B" },
    {
      value: "qwen/qwq-32b-preview:free",
      label: "QwQ 32B Preview",
    },
    {
      value: "qwen/qwen2.5-vl-72b-instruct:free",
      label: "Qwen2.5 VL 72B Instruct",
    },
    {
      value: "qwen/qwen2.5-72b-instruct:free",
      label: "Qwen2.5 72B Instruct",
    },
    {
      value: "qwen/qwen-2.5-coder-32b-instruct:free",
      label: "Qwen2.5 Coder 32B Instruct",
    },
    { value: "qwen/qwen-2-7b-instruct:free", label: "Qwen 2 7B Instruct" },
  ];

  const groupMetaOptions = [
    {
      value: "meta-llama/llama-3.3-70b-instruct:free",
      label: "Llama 3.3 70B Instruct",
    },
    {
      value: "meta-llama/llama-3.2-3b-instruct:free",
      label: "Llama 3.2 3B Instruct",
    },
    {
      value: "meta-llama/llama-3.2-1b-instruct:free",
      label: "Llama 3.2 1B Instruct",
    },
    {
      value: "meta-llama/llama-3.2-11b-vision-instruct:free",
      label: "Llama 3.2 11B Vision Instruct",
    },
    {
      value: "meta-llama/llama-3.1-8b-instruct:free",
      label: "Llama 3.1 8B Instruct",
    },
    {
      value: "meta-llama/llama-3-8b-instruct:free",
      label: "Llama 3 8B Instruct",
    },
  ];

  const groupMistralOptions = [
    {
      value: "mistralai/mistral-small-24b-instruct-2501:free",
      label: "Mistral Small 3",
    },
    { value: "mistralai/mistral-nemo:free", label: "Mistral Nemo" },
    {
      value: "mistralai/mistral-7b-instruct:free",
      label: "Mistral 7B Instruct",
    },
  ];

  const groupOthersOptions = [
    {
      value: "moonshotai/moonlight-16b-a3b-instruct:free",
      label: "Moonshot AI: Moonlight 16B A3B Instruct",
    },
    {
      value: "nousresearch/deephermes-3-llama-3-8b-preview:free",
      label: "Nous: DeepHermes 3 Llama 3 8B Preview",
    },
    {
      value: "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
      label: "Dolphin3.0 R1 Mistral 24B",
    },
    {
      value: "cognitivecomputations/dolphin3.0-mistral-24b:free",
      label: "Dolphin3.0 Mistral 24B",
    },
    {
      value: "microsoft/phi-3-mini-128k-instruct:free",
      label: "Microsoft: Phi-3 Mini 128K Instruct",
    },
    {
      value: "microsoft/phi-3-medium-128k-instruct:free",
      label: "Microsoft: Phi-3 Medium 128K Instruct",
    },
    { value: "openchat/openchat-7b:free", label: "OpenChat 3.5 7B" },
    { value: "rekaai/reka-flash-3:free", label: "Reka: Flash 3" },
    {
      value: "sophosympatheia/rogue-rose-103b-v0.2:free",
      label: "Rogue Rose 103B v0.2",
    },
    {
      value: "nvidia/llama-3.1-nemotron-70b-instruct:free",
      label: "NVIDIA: Llama 3.1 Nemotron 70B Instruct",
    },
    { value: "undi95/toppy-m-7b:free", label: "Toppy M 7B" },
    {
      value: "huggingfaceh4/zephyr-7b-beta:free",
      label: "Hugging Face: Zephyr 7B",
    },
    { value: "gryphe/mythomax-l2-13b:free", label: "MythoMax 13B" },
  ];

  // Thêm options cho OlympicCoder
  const groupOlympicCoderOptions = [
    { value: "open-r1/olympiccoder-7b:free", label: "OlympicCoder 7B" },
    { value: "open-r1/olympiccoder-32b:free", label: "OlympicCoder 32B" },
  ];

  // Khi mở modal, load lại dữ liệu và mở nhóm chứa model đã lưu
  useEffect(() => {
    if (isOpen) {
      setApiKey(getLocalStorage("openrouter_api_key", ""));
      const savedModel = getLocalStorage(
        "openrouter_model",
        "deepseek/deepseek-r1:free"
      );
      setModel(savedModel);
      setSystemPrompt(
        getLocalStorage(
          "openrouter_system_prompt",
          "Bạn là 1 Chat Bot AI tên là TomiChan được phát triển bởi TomiSakae!"
        )
      );
      setTemperature(Number(getLocalStorage("openrouter_temperature", "0.7")));
      setMaxTokens(Number(getLocalStorage("openrouter_max_tokens", "4096")));
      setTopP(Number(getLocalStorage("openrouter_top_p", "0.95")));
      setTopK(Number(getLocalStorage("openrouter_top_k", "40")));

      // Mở nhóm chứa model vừa lưu
      if (savedModel.startsWith("open-r1/")) {
        setIsGoogleOpen(false);
        setIsDeepSeekOpen(false);
        setIsQwenOpen(false);
        setIsMetaOpen(false);
        setIsMistralOpen(false);
        setIsOthersOpen(false);
        setIsOlympicCoderOpen(true);
      } else if (savedModel.startsWith("google/")) {
        setIsGoogleOpen(true);
        setIsDeepSeekOpen(false);
        setIsQwenOpen(false);
        setIsMetaOpen(false);
        setIsMistralOpen(false);
        setIsOthersOpen(false);
      } else if (savedModel.startsWith("deepseek/")) {
        setIsGoogleOpen(false);
        setIsDeepSeekOpen(true);
        setIsQwenOpen(false);
        setIsMetaOpen(false);
        setIsMistralOpen(false);
        setIsOthersOpen(false);
      } else if (savedModel.startsWith("qwen/")) {
        setIsGoogleOpen(false);
        setIsDeepSeekOpen(false);
        setIsQwenOpen(true);
        setIsMetaOpen(false);
        setIsMistralOpen(false);
        setIsOthersOpen(false);
      } else if (savedModel.startsWith("meta-llama/")) {
        setIsGoogleOpen(false);
        setIsDeepSeekOpen(false);
        setIsQwenOpen(false);
        setIsMetaOpen(true);
        setIsMistralOpen(false);
        setIsOthersOpen(false);
      } else if (savedModel.startsWith("mistralai/")) {
        setIsGoogleOpen(false);
        setIsDeepSeekOpen(false);
        setIsQwenOpen(false);
        setIsMetaOpen(false);
        setIsMistralOpen(true);
        setIsOthersOpen(false);
      } else {
        setIsGoogleOpen(false);
        setIsDeepSeekOpen(false);
        setIsQwenOpen(false);
        setIsMetaOpen(false);
        setIsMistralOpen(false);
        setIsOthersOpen(true);
      }
    }
  }, [isOpen]);

  const handleModelChange = (selectedModel: string) => {
    setModel(selectedModel);
  };

  const handleReset = () => {
    const currentApiKey = apiKey;
    setModel("deepseek/deepseek-r1:free");
    setSystemPrompt(
      "Bạn là 1 Chat Bot AI tên là TomiChan được phát triển bởi TomiSakae!"
    );
    setTemperature(0.7);
    setMaxTokens(4096);
    setTopP(0.95);
    setTopK(40);
    setApiKey(currentApiKey);
    // Mở nhóm mặc định của Google
    setIsGoogleOpen(false);
    setIsDeepSeekOpen(true);
    setIsQwenOpen(false);
    setIsMetaOpen(false);
    setIsMistralOpen(false);
    setIsOthersOpen(false);
  };

  const handleSave = () => {
    setLocalStorage("openrouter_api_key", apiKey);
    setLocalStorage("openrouter_model", model);
    setLocalStorage("openrouter_system_prompt", systemPrompt);
    setLocalStorage("openrouter_temperature", temperature.toString());
    setLocalStorage("openrouter_max_tokens", maxTokens.toString());
    setLocalStorage("openrouter_top_p", topP.toString());
    setLocalStorage("openrouter_top_k", topK.toString());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt OpenRouter"
      maxWidth="4xl"
      onReset={handleReset}
      onSave={handleSave}
    >
      <form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cột trái - Cài đặt chung */}
          <div className="space-y-4 order-2 md:order-1">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-black"
                placeholder="sk-or-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Lấy API Key tại{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  OpenRouter Dashboard
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temperature ({temperature})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                min="1"
                max="32768"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Top P ({topP})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Top K
              </label>
              <input
                type="number"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-black"
              />
            </div>
          </div>

          {/* Cột phải - Chọn mô hình */}
          <div className="space-y-4 order-1 md:order-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chọn mô hình
            </label>
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {[
                {
                  title: "OlympicCoder",
                  options: groupOlympicCoderOptions,
                  isOpen: isOlympicCoderOpen,
                  setIsOpen: setIsOlympicCoderOpen,
                },
                {
                  title: "Google",
                  options: groupGoogleOptions,
                  isOpen: isGoogleOpen,
                  setIsOpen: setIsGoogleOpen,
                },
                {
                  title: "DeepSeek",
                  options: groupDeepSeekOptions,
                  isOpen: isDeepSeekOpen,
                  setIsOpen: setIsDeepSeekOpen,
                },
                {
                  title: "Qwen",
                  options: groupQwenOptions,
                  isOpen: isQwenOpen,
                  setIsOpen: setIsQwenOpen,
                },
                {
                  title: "Meta",
                  options: groupMetaOptions,
                  isOpen: isMetaOpen,
                  setIsOpen: setIsMetaOpen,
                },
                {
                  title: "Mistral",
                  options: groupMistralOptions,
                  isOpen: isMistralOpen,
                  setIsOpen: setIsMistralOpen,
                },
                {
                  title: "Others",
                  options: groupOthersOptions,
                  isOpen: isOthersOpen,
                  setIsOpen: setIsOthersOpen,
                },
              ].map((group) => (
                <div
                  key={group.title}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => group.setIsOpen(!group.isOpen)}
                    className="w-full flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="font-medium">{group.title}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {group.options.length} mô hình
                      </span>
                      {group.isOpen ? (
                        <IconChevronUp size={18} />
                      ) : (
                        <IconChevronDown size={18} />
                      )}
                    </div>
                  </button>
                  {group.isOpen && (
                    <div className="p-2 space-y-2">
                      {group.options.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                            model === option.value
                              ? "bg-blue-50 dark:bg-blue-900"
                              : "hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                        >
                          <input
                            type="radio"
                            name="openrouter_model"
                            value={option.value}
                            checked={model === option.value}
                            onChange={() => handleModelChange(option.value)}
                            className="mr-2"
                          />
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {option.value}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </ModalWrapper>
  );
}
