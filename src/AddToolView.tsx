import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FilePlus2,
  FolderOpen,
  Gauge,
  Link,
  ListPlus,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  customAddCategoryId,
  getCategoryName,
  type CategoryDefinition,
  type Tool,
} from "./core/catalog";
import type { AiToolCandidate, AiToolGitHubContext } from "./core/aiTool";
import type { AiLogInput } from "./core/aiLog";
import {
  createDefaultAddToolDraft,
  describeAddToolDraft,
  getAddToolModeLabel,
  getBaseName,
  inferAddToolDraftFromLocalPath,
  toCustomToolInput,
  updateAddToolDraftFromSourceUrl,
  type AddToolDraft,
  type AddToolMode,
} from "./core/addToolDraft";
import type { CustomToolInput } from "./core/config";

export type AddToolFocus = {
  nonce: number;
  tab?: AddToolTab;
  sourceUrl?: string;
  categoryId?: string;
};

type AddToolTab = "local" | "link" | "manual";
type LogLevel = "info" | "success" | "warning" | "error";
type PageFeedback = {
  level: LogLevel;
  message: string;
};

type AddToolSettings = {
  toolRootPath: string;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
};

type AiLinkPreview = {
  candidate: AiToolCandidate;
  context: AiToolGitHubContext;
};

export function AddToolView({
  settings,
  categories,
  allCategories,
  customTools,
  focus,
  onAddManualTool,
  onAddAiTool,
  onRemoveCustomTool,
  onUninstallCustomTool,
  onOpenSettings,
  onOpenUrl,
  onLog,
  onRecordAiLog,
}: {
  settings: AddToolSettings;
  categories: CategoryDefinition[];
  allCategories: CategoryDefinition[];
  customTools: Tool[];
  focus: AddToolFocus;
  onAddManualTool: (input: CustomToolInput) => Promise<void>;
  onAddAiTool: (
    candidate: AiToolCandidate,
    context: AiToolGitHubContext,
    categoryId?: string,
  ) => Promise<void>;
  onRemoveCustomTool: (toolId: string) => Promise<void>;
  onUninstallCustomTool: (tool: Tool) => Promise<void>;
  onOpenSettings: () => void;
  onOpenUrl: (url: string) => Promise<void>;
  onLog: (level: LogLevel, message: string) => void;
  onRecordAiLog?: (input: AiLogInput) => Promise<void> | void;
}) {
  const [activeTab, setActiveTab] = useState<AddToolTab>("local");
  const [localDraft, setLocalDraft] = useState(() =>
    createDefaultAddToolDraft(customAddCategoryId),
  );
  const [linkDraft, setLinkDraft] = useState(() =>
    createDefaultAddToolDraft(customAddCategoryId),
  );
  const [manualDraft, setManualDraft] = useState(() =>
    createDefaultAddToolDraft(customAddCategoryId),
  );
  const [linkPreview, setLinkPreview] = useState<AiLinkPreview>();
  const [showLocalAdvanced, setShowLocalAdvanced] = useState(false);
  const [showManualAdvanced, setShowManualAdvanced] = useState(true);
  const [busy, setBusy] = useState<"local-ai" | "link-ai" | "add" | undefined>();
  const [feedback, setFeedback] = useState<PageFeedback>();
  const aiReady = Boolean(settings.aiBaseUrl && settings.aiApiKey && settings.aiModel);

  useEffect(() => {
    if (!focus.nonce) {
      return;
    }

    const nextTab = focus.tab ?? (focus.sourceUrl ? "link" : "local");
    setActiveTab(nextTab);
    if (focus.sourceUrl) {
      setLinkDraft((current) =>
        updateAddToolDraftFromSourceUrl(
          {
            ...current,
            categoryId: focus.categoryId ?? current.categoryId,
          },
          focus.sourceUrl ?? "",
        ),
      );
      setLinkPreview(undefined);
      setFeedback(undefined);
    }
  }, [focus]);

  const customToolRows = useMemo(
    () =>
      customTools.map((tool) => ({
        tool,
        description: describeCustomTool(tool),
        category: getCategoryName(tool.category, allCategories),
      })),
    [customTools, allCategories],
  );

  function updateDraft(tab: AddToolTab, patch: Partial<AddToolDraft>) {
    const updater = (current: AddToolDraft) => ({ ...current, ...patch });
    setFeedback(undefined);
    if (tab === "link") {
      setLinkDraft(updater);
    } else if (tab === "manual") {
      setManualDraft(updater);
    } else {
      setLocalDraft(updater);
    }
  }

  function requireAiSettings() {
    if (aiReady) {
      return true;
    }

    showFeedback("warning", "请先在设置里保存 AI 接口 URL、API Key 和模型名称。");
    return false;
  }

  function showFeedback(level: LogLevel, message: string) {
    setFeedback({ level, message });
    onLog(level, message);
  }

  async function chooseLocalToolFile() {
    if (!window.winKitBox) {
      showFeedback("warning", "浏览器预览模式不能选择本地文件。");
      return;
    }

    const filePath = await window.winKitBox.selectLocalFile(localDraft.localPath);
    if (!filePath) {
      return;
    }

    const suggestion = inferAddToolDraftFromLocalPath(filePath);
    setLocalDraft((current) => ({
      ...current,
      ...suggestion,
      categoryId: current.categoryId,
      name: current.name || suggestion.name,
    }));
    setFeedback({
      level: "info",
      message: `已选择本地文件：${getBaseName(filePath)}。`,
    });
  }

  async function analyzeLocalFile() {
    if (!window.winKitBox) {
      showFeedback("warning", "浏览器预览模式不能调用 AI 分析。");
      return;
    }

    if (!localDraft.localPath) {
      showFeedback("warning", "请先选择要分析的本地文件。");
      return;
    }

    if (!requireAiSettings()) {
      return;
    }

    setBusy("local-ai");
    setFeedback(undefined);
    try {
      const result = await window.winKitBox.analyzeLocalFile({
        baseUrl: settings.aiBaseUrl,
        apiKey: settings.aiApiKey,
        model: settings.aiModel,
        filePath: localDraft.localPath,
        toolName: localDraft.name,
        categoryId: localDraft.categoryId,
        remark: localDraft.homepage,
      });
      const candidate = result.candidate;
      setLocalDraft((current) => ({
        ...current,
        mode: (candidate.mode as AddToolMode) || current.mode,
        name: candidate.name || current.name,
        homepage: candidate.homepage ?? current.homepage,
        archiveExecutable: candidate.archiveExecutable ?? current.archiveExecutable,
        installCommand:
          candidate.mode === "command" ? candidate.launchCommand || "" : "",
        uninstallCommand:
          candidate.uninstallCommand ?? current.uninstallCommand,
        launchCommand:
          candidate.mode === "local-installer" ||
          candidate.mode === "local-archive" ||
          candidate.mode === "collect"
            ? candidate.launchCommand ?? current.launchCommand
            : current.launchCommand,
        aiExplanation:
          candidate.explanation || "AI 已分析该文件，请确认信息后添加到工具箱。",
      }));
      setShowLocalAdvanced(false);
      await onRecordAiLog?.({
        kind: "local-analysis",
        status: "success",
        title: `AI 本地文件分析：${candidate.name || localDraft.name || "未命名工具"}`,
        prompt: [
          `文件：${localDraft.localPath}`,
          localDraft.name ? `名称：${localDraft.name}` : "",
          localDraft.homepage ? `备注：${localDraft.homepage}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        response: result.aiResponse || candidate.explanation || "AI 已分析本地文件。",
        structured: candidate,
        model: settings.aiModel,
        source: "添加工具 / 本地文件",
        toolName: candidate.name || localDraft.name,
      });
      showFeedback("success", "AI 文件分析完成，请确认方案后添加到工具箱。");
    } catch (error) {
      await onRecordAiLog?.({
        kind: "local-analysis",
        status: "error",
        title: "AI 本地文件分析失败",
        prompt: localDraft.localPath,
        response: error instanceof Error ? error.message : "AI 分析本地文件失败。",
        model: settings.aiModel,
        source: "添加工具 / 本地文件",
        toolName: localDraft.name,
      });
      showFeedback(
        "error",
        error instanceof Error ? error.message : "AI 分析本地文件失败。",
      );
    } finally {
      setBusy(undefined);
    }
  }

  async function analyzeLink() {
    if (!window.winKitBox) {
      showFeedback("warning", "浏览器预览模式不能调用 AI 链接分析。");
      return;
    }

    if (!linkDraft.sourceUrl.trim()) {
      showFeedback("warning", "请先输入工具主页、下载页或 GitHub 链接。");
      return;
    }

    if (!requireAiSettings()) {
      return;
    }

    setBusy("link-ai");
    setLinkPreview(undefined);
    setFeedback(undefined);
    try {
      const result = await window.winKitBox.generateAiTool({
        baseUrl: settings.aiBaseUrl,
        apiKey: settings.aiApiKey,
        model: settings.aiModel,
        toolUrl: linkDraft.sourceUrl,
        categoryId: linkDraft.categoryId,
      });
      setLinkPreview(result);
      setLinkDraft((current) => ({
        ...current,
        name: result.candidate.name || current.name,
        homepage: result.context.htmlUrl || current.homepage,
        aiExplanation:
          result.candidate.description ||
          result.candidate.summary ||
          "AI 已生成候选方案，请确认后添加到工具箱。",
      }));
      await onRecordAiLog?.({
        kind: "tool-analysis",
        status: "success",
        title: `AI 链接分析：${result.candidate.name || linkDraft.sourceUrl}`,
        prompt: linkDraft.sourceUrl,
        response:
          result.aiResponse ||
          result.candidate.description ||
          result.candidate.summary ||
          "AI 已生成候选方案。",
        structured: result,
        model: settings.aiModel,
        source: "添加工具 / 链接添加",
        toolName: result.candidate.name,
        repoUrl: result.context.htmlUrl || linkDraft.sourceUrl,
      });
      showFeedback("success", "AI 链接分析完成，请确认候选方案后添加到工具箱。");
    } catch (error) {
      await onRecordAiLog?.({
        kind: "tool-analysis",
        status: "error",
        title: "AI 链接分析失败",
        prompt: linkDraft.sourceUrl,
        response: error instanceof Error ? error.message : "AI 链接分析失败。",
        model: settings.aiModel,
        source: "添加工具 / 链接添加",
        repoUrl: linkDraft.sourceUrl,
      });
      showFeedback(
        "error",
        error instanceof Error ? error.message : "AI 链接分析失败。",
      );
    } finally {
      setBusy(undefined);
    }
  }

  async function addLinkTool() {
    if (!linkPreview) {
      showFeedback("warning", "请先用 AI 分析链接，确认候选方案后再添加。");
      return;
    }

    setBusy("add");
    setFeedback(undefined);
    try {
      await onAddAiTool(
        linkPreview.candidate,
        linkPreview.context,
        linkDraft.categoryId,
      );
      setFeedback({
        level: "success",
        message: `${linkPreview.candidate.name} 已添加到工具箱。`,
      });
      setLinkDraft(createDefaultAddToolDraft(linkDraft.categoryId));
      setLinkPreview(undefined);
    } catch (error) {
      showFeedback(
        "error",
        error instanceof Error ? error.message : "添加链接工具失败。",
      );
    } finally {
      setBusy(undefined);
    }
  }

  async function addDraftTool(tab: "local" | "manual") {
    const draft = tab === "manual" ? manualDraft : localDraft;
    setBusy("add");
    setFeedback(undefined);
    try {
      await onAddManualTool(toCustomToolInput(draft, settings.toolRootPath));
      setFeedback({
        level: "success",
        message: `${draft.name || "工具"} 已添加到工具箱。`,
      });
      const next = createDefaultAddToolDraft(draft.categoryId);
      if (tab === "manual") {
        setManualDraft(next);
      } else {
        setLocalDraft(next);
      }
    } catch (error) {
      showFeedback(
        "error",
        error instanceof Error ? error.message : "添加工具失败。",
      );
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <div className="add-tool-page">
      <header className="command-bar page-topbar">
        <div className="command-bar-title">
          <div className="command-bar-icon add-tool-icon">
            <ListPlus size={22} />
          </div>
          <div>
            <p className="eyebrow">添加工具</p>
            <h2>本地文件、网页链接和手动命令统一入口</h2>
          </div>
        </div>
        {!aiReady && (
          <button className="ghost-button" type="button" onClick={onOpenSettings}>
            <Wrench size={16} />
            配置 AI
          </button>
        )}
      </header>

      <div className="add-tool-tabs">
        {addToolTabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && (
        <p className={`settings-status page-feedback ${feedback.level}`}>
          {feedback.message}
        </p>
      )}

      <div className="add-tool-layout">
        <section className="settings-card full-span add-tool-workspace">
          {activeTab === "local" && (
            <LocalFilePanel
              draft={localDraft}
              categories={categories}
              busy={busy}
              showAdvanced={showLocalAdvanced}
              onToggleAdvanced={() => setShowLocalAdvanced((value) => !value)}
              onUpdate={(patch) => updateDraft("local", patch)}
              onChooseFile={chooseLocalToolFile}
              onAnalyze={analyzeLocalFile}
              onAdd={() => void addDraftTool("local")}
            />
          )}

          {activeTab === "link" && (
            <LinkAddPanel
              draft={linkDraft}
              categories={categories}
              busy={busy}
              preview={linkPreview}
              onUpdate={(patch) => {
                updateDraft("link", patch);
                if (patch.sourceUrl !== undefined) {
                  setLinkPreview(undefined);
                }
              }}
              onAnalyze={analyzeLink}
              onAdd={() => void addLinkTool()}
              onOpenUrl={onOpenUrl}
            />
          )}

          {activeTab === "manual" && (
            <ManualPanel
              draft={manualDraft}
              categories={categories}
              busy={busy}
              showAdvanced={showManualAdvanced}
              onToggleAdvanced={() => setShowManualAdvanced((value) => !value)}
              onUpdate={(patch) => updateDraft("manual", patch)}
              onAdd={() => void addDraftTool("manual")}
            />
          )}
        </section>

        <section className="settings-card full-span">
          <div className="section-title">
            <ListPlus size={15} />
            已添加的自定义工具
          </div>
          {customToolRows.length === 0 ? (
            <p className="settings-text">
              还没有自定义工具。新添加的工具会长期保存在本机配置里。
            </p>
          ) : (
            <div className="custom-tool-list">
              {customToolRows.map(({ tool, category, description }) => (
                <div className="custom-tool-row" key={tool.id}>
                  <div>
                    <strong>{tool.name}</strong>
                    <span>
                      {category} · {description}
                    </span>
                  </div>
                  <button
                    className="secondary-button danger"
                    type="button"
                    onClick={async () => {
                      if (!tool.collectionOnly) {
                        await onUninstallCustomTool(tool);
                      }
                      await onRemoveCustomTool(tool.id);
                    }}
                  >
                    <Trash2 size={14} />
                    {tool.collectionOnly ? "移除" : "卸载并移除"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function LocalFilePanel({
  draft,
  categories,
  busy,
  showAdvanced,
  onToggleAdvanced,
  onUpdate,
  onChooseFile,
  onAnalyze,
  onAdd,
}: {
  draft: AddToolDraft;
  categories: CategoryDefinition[];
  busy?: string;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onUpdate: (patch: Partial<AddToolDraft>) => void;
  onChooseFile: () => void;
  onAnalyze: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="section-title">
        <FilePlus2 size={15} />
        本地文件
      </div>
      <div className="manual-add-flow">
        <div className="manual-file-panel">
          <label className="field-label file-pick-field">
            本地文件
            <span className="path-row compact">
              <input
                value={draft.localPath}
                onChange={(event) => {
                  const localPath = event.target.value;
                  const suggestion = localPath
                    ? inferAddToolDraftFromLocalPath(localPath)
                    : undefined;
                  onUpdate({
                    ...(suggestion ?? {}),
                    localPath,
                    name: draft.name || suggestion?.name || "",
                    aiExplanation: suggestion?.aiExplanation || "",
                  });
                }}
                placeholder="exe / msi / zip / lnk / bat / cmd / ps1"
              />
              <button className="secondary-button" type="button" onClick={onChooseFile}>
                <FolderOpen size={14} />
                选择
              </button>
            </span>
          </label>
          <div className="manual-tool-ai-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!draft.localPath || busy === "local-ai"}
              onClick={onAnalyze}
            >
              <Sparkles size={14} />
              {busy === "local-ai" ? "分析中" : "AI 分析"}
            </button>
            <button className="text-button" type="button" onClick={onToggleAdvanced}>
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              高级设置
            </button>
          </div>
        </div>

        <DraftPreview draft={draft} categories={categories} />
      </div>

      <CommonDraftFields draft={draft} categories={categories} onUpdate={onUpdate} />
      {showAdvanced && <AdvancedDraftFields draft={draft} onUpdate={onUpdate} />}

      <div className="settings-actions">
        <button className="primary-button" type="button" disabled={busy === "add"} onClick={onAdd}>
          <Plus size={15} />
          添加到工具箱
        </button>
        <span>安装包和 ZIP 会在点击安装时处理；普通 exe 默认只收纳。</span>
      </div>
    </>
  );
}

function LinkAddPanel({
  draft,
  categories,
  busy,
  preview,
  onUpdate,
  onAnalyze,
  onAdd,
  onOpenUrl,
}: {
  draft: AddToolDraft;
  categories: CategoryDefinition[];
  busy?: string;
  preview?: AiLinkPreview;
  onUpdate: (patch: Partial<AddToolDraft>) => void;
  onAnalyze: () => void;
  onAdd: () => void;
  onOpenUrl: (url: string) => Promise<void>;
}) {
  return (
    <>
      <div className="section-title">
        <Link size={15} />
        链接添加
      </div>
      <div className="custom-tool-form ai-tool-form">
        <label className="field-label wide">
          工具主页 / 下载页
          <input
            value={draft.sourceUrl}
            onChange={(event) =>
              onUpdate(updateAddToolDraftFromSourceUrl(draft, event.target.value))
            }
            placeholder="GitHub 仓库、官网、下载页或直接下载链接"
          />
        </label>
        <label className="field-label">
          添加到分类
          <select
            value={draft.categoryId}
            onChange={(event) => onUpdate({ categoryId: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          候选名称
          <input
            value={draft.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            placeholder="AI 分析后自动填入"
          />
        </label>
      </div>

      <div className="settings-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={busy === "link-ai"}
          onClick={onAnalyze}
        >
          <Sparkles size={15} />
          {busy === "link-ai" ? "分析中" : "AI 分析链接"}
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={!preview || busy === "add"}
          onClick={onAdd}
        >
          <Plus size={15} />
          添加到工具箱
        </button>
        {draft.sourceUrl && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => void onOpenUrl(draft.sourceUrl)}
          >
            <ExternalLink size={15} />
            打开链接
          </button>
        )}
      </div>

      <div className="manual-tool-preview link-preview">
        <div className="ai-result-title">
          <Sparkles size={14} />
          AI 候选预览
        </div>
        {preview ? (
          <>
            <strong>{preview.candidate.name}</strong>
            <p>{preview.candidate.description || preview.candidate.summary}</p>
            <dl>
              <dt>安装方式</dt>
              <dd>{preview.candidate.install.type}</dd>
              <dt>来源</dt>
              <dd>{preview.context.htmlUrl}</dd>
              <dt>分类</dt>
              <dd>{getCategoryName(draft.categoryId, categories)}</dd>
            </dl>
          </>
        ) : (
          <p>输入链接后先点 AI 分析。支持 GitHub、官网页面和普通下载链接。</p>
        )}
      </div>
    </>
  );
}

function ManualPanel({
  draft,
  categories,
  busy,
  showAdvanced,
  onToggleAdvanced,
  onUpdate,
  onAdd,
}: {
  draft: AddToolDraft;
  categories: CategoryDefinition[];
  busy?: string;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onUpdate: (patch: Partial<AddToolDraft>) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="section-title">
        <Gauge size={15} />
        手动添加
      </div>
      <CommonDraftFields draft={draft} categories={categories} onUpdate={onUpdate} />
      <div className="settings-actions">
        <button className="text-button" type="button" onClick={onToggleAdvanced}>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          高级设置
        </button>
      </div>
      {showAdvanced && <AdvancedDraftFields draft={draft} onUpdate={onUpdate} />}
      <div className="settings-actions">
        <button className="primary-button" type="button" disabled={busy === "add"} onClick={onAdd}>
          <Plus size={15} />
          添加到工具箱
        </button>
        <span>适合只收纳工具、自定义命令或手动填写 winget ID。</span>
      </div>
    </>
  );
}

function CommonDraftFields({
  draft,
  categories,
  onUpdate,
}: {
  draft: AddToolDraft;
  categories: CategoryDefinition[];
  onUpdate: (patch: Partial<AddToolDraft>) => void;
}) {
  return (
    <div className="custom-tool-form manual-tool-form compact">
      <label className="field-label">
        工具名称
        <input
          value={draft.name}
          onChange={(event) => onUpdate({ name: event.target.value })}
          placeholder="例如 LocalSend / 自用脚本"
        />
      </label>
      <label className="field-label">
        添加到分类
        <select
          value={draft.categoryId}
          onChange={(event) => onUpdate({ categoryId: event.target.value })}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        主页 / 备注
        <input
          value={draft.homepage}
          onChange={(event) => onUpdate({ homepage: event.target.value })}
          placeholder="可留空"
        />
      </label>
    </div>
  );
}

function AdvancedDraftFields({
  draft,
  onUpdate,
}: {
  draft: AddToolDraft;
  onUpdate: (patch: Partial<AddToolDraft>) => void;
}) {
  return (
    <div className="custom-tool-form manual-tool-form advanced">
      <label className="field-label">
        处理方式
        <select
          value={draft.mode}
          onChange={(event) => onUpdate({ mode: event.target.value as AddToolMode })}
        >
          <option value="collect">只加入工具箱</option>
          <option value="local-installer">本地安装包</option>
          <option value="local-archive">ZIP 便携包</option>
          <option value="command">自定义命令</option>
          <option value="winget">winget 包</option>
        </select>
      </label>
      <label className="field-label">
        ZIP 内启动程序
        <input
          value={draft.archiveExecutable}
          onChange={(event) => onUpdate({ archiveExecutable: event.target.value })}
          placeholder="例如 app.exe 或 bin\\app.exe"
        />
      </label>
      <label className="field-label">
        启动命令
        <input
          value={draft.launchCommand}
          onChange={(event) => onUpdate({ launchCommand: event.target.value })}
          placeholder="可留空"
        />
      </label>
      <label className="field-label">
        winget ID
        <input
          value={draft.wingetId}
          onChange={(event) => onUpdate({ wingetId: event.target.value })}
          placeholder="例如 Microsoft.PowerToys"
        />
      </label>
      <label className="field-label wide">
        安装命令
        <input
          value={draft.installCommand}
          onChange={(event) => onUpdate({ installCommand: event.target.value })}
          placeholder="仅自定义命令模式需要"
        />
      </label>
      <label className="field-label wide">
        卸载命令
        <input
          value={draft.uninstallCommand}
          onChange={(event) => onUpdate({ uninstallCommand: event.target.value })}
          placeholder="可留空"
        />
      </label>
    </div>
  );
}

function DraftPreview({
  draft,
  categories,
}: {
  draft: AddToolDraft;
  categories: CategoryDefinition[];
}) {
  return (
    <div className="manual-tool-preview">
      <div className="ai-result-title">
        <Sparkles size={14} />
        方案预览
      </div>
      <strong>{draft.name || "选择文件后自动生成名称"}</strong>
      <p>{draft.aiExplanation || describeAddToolDraft(draft)}</p>
      <dl>
        <dt>处理方式</dt>
        <dd>{getAddToolModeLabel(draft.mode)}</dd>
        <dt>分类</dt>
        <dd>{getCategoryName(draft.categoryId, categories)}</dd>
        {draft.localPath && (
          <>
            <dt>文件</dt>
            <dd>{getBaseName(draft.localPath)}</dd>
          </>
        )}
        {draft.mode === "local-archive" && (
          <>
            <dt>ZIP 启动程序</dt>
            <dd>{draft.archiveExecutable || "需要 AI 分析或在高级设置填写"}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

const addToolTabs: {
  id: AddToolTab;
  label: string;
  icon: typeof FilePlus2;
}[] = [
  { id: "local", label: "本地文件", icon: FilePlus2 },
  { id: "link", label: "链接添加", icon: Link },
  { id: "manual", label: "手动添加", icon: Gauge },
];

function describeCustomTool(tool: Tool) {
  if (tool.collectionOnly) {
    return "只收纳 · 不执行安装";
  }

  if (tool.localSource?.kind === "installer") {
    return `本地安装包 · ${getBaseName(tool.localSource.path)}`;
  }

  if (tool.localSource?.kind === "archive") {
    return `本地 ZIP · ${tool.localSource.executable ?? getBaseName(tool.localSource.path)}`;
  }

  if (tool.localSource?.kind === "launcher") {
    return `本地程序 · ${getBaseName(tool.localSource.path)}`;
  }

  if (tool.wingetId) {
    return `winget · ${tool.wingetId}`;
  }

  if (tool.installer) {
    return tool.installer.assetPattern
      ? `GitHub 安装包 · ${tool.installer.assetPattern}`
      : `下载安装包 · ${tool.installer.fileName}`;
  }

  if (tool.portable) {
    return tool.portable.assetPattern
      ? `GitHub 便携包 · ${tool.portable.assetPattern}`
      : `下载便携包 · ${tool.portable.executable}`;
  }

  if (tool.customInstallCommand) {
    return "自定义命令";
  }

  return tool.repoUrl ?? tool.homepage;
}
