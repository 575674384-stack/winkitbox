import { ArrowLeft, NotebookPen, Plus, Trash2 } from "lucide-react";
import type { NotebookEntry } from "../core/notebook";
import { PageHeaderIcon } from "./PageHeaderIcon";

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

  return (
    <div className="notes-page">
      <header className="command-bar page-topbar">
        <div className="command-bar-title">
          <PageHeaderIcon page="notes" className="notes-icon" alt="记事本">
            <NotebookPen size={22} />
          </PageHeaderIcon>
          <div>
            <p className="eyebrow">个人记录</p>
            <h2>记事本</h2>
          </div>
        </div>
        <div className="top-actions">
          {activeEntry ? (
            <button className="secondary-button" type="button" onClick={() => onSelect("")}>
              <ArrowLeft size={16} />
              返回列表
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={onCreate}>
              <Plus size={16} />
              新建记事本
            </button>
          )}
        </div>
      </header>

      {activeEntry ? (
        <section className="note-workbench" aria-label="编辑记事本">
          <div className="note-workbench-head">
            <button className="secondary-button" type="button" onClick={() => onSelect("")}>
              <ArrowLeft size={15} />
              返回列表
            </button>
            <button
              className="secondary-button danger"
              type="button"
              onClick={() => onDelete(activeEntry.id)}
            >
              <Trash2 size={15} />
              删除记事本
            </button>
          </div>
          <input
            className="note-title-input"
            value={activeEntry.title}
            onChange={(event) => onUpdate(activeEntry.id, { title: event.target.value })}
            placeholder="记事本标题"
            aria-label="记事本标题"
          />
          <textarea
            className="note-workbench-textarea"
            value={activeEntry.content}
            onChange={(event) => onUpdate(activeEntry.id, { content: event.target.value })}
            placeholder="记录装机备注、命令、链接或临时想法。内容会实时保存。"
            aria-label="记事本内容"
          />
        </section>
      ) : entries.length === 0 ? (
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
    </div>
  );
}
