import { NotebookPen, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { NotebookEntry } from "../core/notebook";

export function NotesView({
  entries,
  activeNoteId,
  onCreate,
  onSelect,
  onUpdate,
  onDelete,
}: {
  entries: NotebookEntry[];
  activeNoteId?: string;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<NotebookEntry, "title" | "content">>,
  ) => void;
  onDelete: (id: string) => void;
}) {
  const activeEntry = entries.find((entry) => entry.id === activeNoteId);
  const [draft, setDraft] = useState({ title: "", content: "" });

  useEffect(() => {
    if (!activeEntry) {
      setDraft({ title: "", content: "" });
      return;
    }

    setDraft({ title: activeEntry.title, content: activeEntry.content });
  }, [activeEntry]);

  function save() {
    if (!activeEntry) {
      return;
    }

    onUpdate(activeEntry.id, draft);
  }

  return (
    <div className="notes-page">
      <header className="command-bar page-topbar">
        <div className="command-bar-title">
          <div className="command-bar-icon notes-icon">
            <NotebookPen size={22} />
          </div>
          <div>
            <p className="eyebrow">个人记录</p>
            <h2>记事本</h2>
          </div>
        </div>
        <div className="top-actions">
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={16} />
            新建记事本
          </button>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="empty-state empty-state-compact">
          <div className="empty-state-icon">
            <NotebookPen size={22} />
          </div>
          <h4>还没有记事本</h4>
          <p>创建一个记事本，用来记录装机备注、命令、链接或临时想法。</p>
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={15} />
            新建记事本
          </button>
        </div>
      ) : (
        <section className="notes-grid" aria-label="记事本列表">
          {entries.map((entry) => (
            <button
              className="note-card"
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry.id)}
            >
              <strong>{entry.title}</strong>
              <span>{entry.content || "空白记事本"}</span>
              <small>{new Date(entry.updatedAt).toLocaleString()}</small>
            </button>
          ))}
        </section>
      )}

      {activeEntry && (
        <div className="note-modal-overlay" role="presentation">
          <section className="note-modal" aria-modal="true" role="dialog">
            <div className="note-editor-head">
              <div>
                <p className="eyebrow">编辑记事本</p>
                <h3>{activeEntry.title}</h3>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="关闭记事本"
                onClick={() => onSelect("")}
              >
                <X size={16} />
              </button>
            </div>
            <label className="field-label">
              标题
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="记事本标题"
              />
            </label>
            <label className="field-label note-content-field">
              内容
              <textarea
                value={draft.content}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="记录你想保存的文本。"
              />
            </label>
            <div className="note-modal-actions">
              <button
                className="secondary-button danger"
                type="button"
                onClick={() => onDelete(activeEntry.id)}
              >
                <Trash2 size={14} />
                删除
              </button>
              <button className="secondary-button" type="button" onClick={() => onSelect("")}>
                <X size={14} />
                关闭
              </button>
              <button className="primary-button" type="button" onClick={save}>
                <Save size={14} />
                保存
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
