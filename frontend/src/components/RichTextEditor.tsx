"use client";

import React, { useEffect } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function RichTextEditor({ value, onChange, placeholder }: {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();
      onChange && onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2 text-gray-800',
      },
    },
  });

  // keep external value in sync if it changes (rare in this form)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const toggle = (cmd: () => void) => (e: React.MouseEvent) => { e.preventDefault(); cmd(); };

  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-1 p-2 border-b bg-gray-40">
        <button className="px-2 py-1 text-xs border rounded hover:bg-white text-gray-800" onMouseDown={toggle(()=>editor.chain().focus().toggleBold().run())}>
          <b>B</b>
        </button>
        <button className="px-2 py-1 text-xs border rounded hover:bg-white italic text-gray-800" onMouseDown={toggle(()=>editor.chain().focus().toggleItalic().run())}>
          I
        </button>
        <button className="px-2 py-1 text-xs border rounded hover:bg-white text-gray-800" onMouseDown={toggle(()=>editor.chain().focus().toggleBulletList().run())}>
          • List
        </button>
        <button className="px-2 py-1 text-xs border rounded hover:bg-white text-gray-800" onMouseDown={toggle(()=>editor.chain().focus().toggleOrderedList().run())}>
          1. List
        </button>
        <button className="px-2 py-1 text-xs border rounded hover:bg-white text-gray-800" onMouseDown={toggle(()=>editor.chain().focus().setParagraph().run())}>
          P
        </button>
        <button className="px-2 py-1 text-xs border rounded hover:bg-white text-gray-800" onMouseDown={toggle(()=>editor.chain().focus().toggleHeading({ level: 3 }).run())}>
          H3
        </button>
      </div>
      <div className="min-h-[140px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
