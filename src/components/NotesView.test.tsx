import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotebookEntry } from "../core/notebook";
import { NotesView } from "./NotesView";

const entries: NotebookEntry[] = [
  {
    id: "note-1",
    title: "装机备注",
    content: "PowerShell 配置记录",
    updatedAt: "2026-06-21T01:00:00.000Z",
  },
];

function getInput(container: HTMLElement, selector: string) {
  const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!input) {
    throw new Error(`Missing input: ${selector}`);
  }
  return input;
}

function setNativeValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function renderNotesView(props: Partial<Parameters<typeof NotesView>[0]> = {}) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const onSelect = vi.fn();
  const onUpdate = vi.fn();

  await act(async () => {
    root.render(
      <NotesView
        entries={entries}
        activeNoteId=""
        onCreate={vi.fn()}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        {...props}
      />,
    );
  });

  return { container, root, onSelect, onUpdate };
}

describe("NotesView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("opens a note from the workbench card list", async () => {
    const { container, root, onSelect } = await renderNotesView();

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".note-card")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(onSelect).toHaveBeenCalledWith("note-1");

    await act(async () => {
      root.unmount();
    });
  });

  it("edits the active note inline and autosaves through onUpdate", async () => {
    const { container, root, onSelect, onUpdate } = await renderNotesView({
      activeNoteId: "note-1",
    });

    const title = getInput(container, ".note-title-input");
    const content = getInput(container, ".note-workbench-textarea");

    await act(async () => {
      setNativeValue(title, "新标题");
    });
    await act(async () => {
      setNativeValue(content, "新的实时内容");
    });

    expect(onUpdate).toHaveBeenCalledWith("note-1", { title: "新标题" });
    expect(onUpdate).toHaveBeenCalledWith("note-1", { content: "新的实时内容" });
    expect(container.querySelector(".note-modal-overlay")).toBeNull();

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("返回列表"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith("");

    await act(async () => {
      root.unmount();
    });
  });
});
