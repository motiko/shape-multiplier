import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { parseSvg } from "../import/svgParser";
import { useStore } from "../state/store";

export function DropZone() {
  const addFigure = useStore((s) => s.addFigure);
  const setError = useStore((s) => s.setError);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => /\.svg$/i.test(f.name) || f.type === "image/svg+xml");
      if (list.length === 0) { setError("Only .svg files are supported."); return; }
      for (const file of list) {
        try {
          const text = await file.text();
          addFigure(parseSvg(text, file.name));
        } catch (e) {
          setError(`${file.name}: ${(e as Error).message}`);
        }
      }
    },
    [addFigure, setError],
  );

  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); void importFiles(e.dataTransfer.files); };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) void importFiles(e.target.files); e.target.value = ""; };

  return (
    <div
      className={"dropzone" + (over ? " over" : "")}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
      role="button"
      tabIndex={0}
      aria-label="Drop SVG files here or click to choose"
    >
      <input ref={inputRef} id="svg-file-input" type="file" accept=".svg,image/svg+xml" multiple hidden onChange={onChange} />
      <strong>Drop SVG files</strong>
      <span>or click to browse</span>
    </div>
  );
}
