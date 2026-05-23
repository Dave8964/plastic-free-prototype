import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const formatter = new Intl.NumberFormat();
const sizeFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});
const INITIAL_VISIBLE_ITEMS = 180;
const VISIBLE_ITEMS_STEP = 180;
const filterDefinitions = [
  { id: "image", label: "Images", type: "kind", value: "image" },
  { id: "video", label: "Videos", type: "kind", value: "video" },
  { id: "texture", label: "Textures (non-KTX)", type: "kind", value: "texture" },
  { id: "pdf", label: "PDFs", type: "kind", value: "pdf" },
  { id: "audio", label: "Audio", type: "kind", value: "audio" },
  { id: "document", label: "Docs", type: "kind", value: "document" },
  { id: "other", label: "Other", type: "kind", value: "other" },
  { id: "gif", label: "GIFs", type: "extension", value: ".gif", filterValue: "ext:.gif" },
  { id: "atx", label: "ATX", type: "extension", value: ".atx", filterValue: "ext:.atx" },
  { id: "ktx", label: "KTX", type: "extension", value: ".ktx", filterValue: "ext:.ktx" },
  { id: "ai", label: "AI", type: "extension", value: ".ai", filterValue: "ext:.ai" },
];
const ktxExtensions = new Set([".ktx", ".ktx2"]);

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${sizeFormatter.format(value)} ${units[unitIndex]}`;
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sourceName(item) {
  return item.sourceLabel || "Library";
}

function itemKind(item) {
  return item.kind || "other";
}

function itemExtension(item) {
  return item.extension || "(none)";
}

function cleanupRisk(item) {
  const source = sourceName(item);
  if (source === "Messages Attachments") {
    return {
      label: "Caution",
      tone: "caution",
      note: "Message attachments",
    };
  }
  if (
    source === "Messages Caches" ||
    source === "MobileSMS Temporary Media" ||
    source === "Notification Images" ||
    source === "Notification Remote 344D9707"
  ) {
    return {
      label: "Lower risk",
      tone: "safe",
      note: "Cache or temporary media",
    };
  }
  return {
    label: "Review",
    tone: "review",
    note: "Unknown source",
  };
}

function matchesFilterValue(item, filterValue) {
  if (filterValue === "all") return true;
  const extension = itemExtension(item);
  if (filterValue === "texture") return itemKind(item) === "texture" && !ktxExtensions.has(extension);
  if (filterValue === "ext:.ktx") return ktxExtensions.has(extension);
  if (filterValue.startsWith("ext:")) return extension === filterValue.slice(4);
  return itemKind(item) === filterValue;
}

function kindIcon(kind) {
  if (kind === "video") return "VID";
  if (kind === "texture") return "KTX";
  if (kind === "pdf") return "PDF";
  if (kind === "audio") return "AUD";
  if (kind === "document") return "DOC";
  if (kind === "other") return "FILE";
  return "IMG";
}

function isRasterPreviewKind(kind) {
  return kind === "image" || kind === "video" || kind === "texture";
}

function FileGlyph({ item, large = false }) {
  return (
    <span className={`file-glyph ${large ? "file-glyph-large" : ""} file-glyph-${item.kind}`}>
      <strong>{kindIcon(item.kind)}</strong>
      <small>{item.extension}</small>
    </span>
  );
}

function TileVisual({ item }) {
  const [failed, setFailed] = useState(false);
  if (!isRasterPreviewKind(item.kind) || failed) {
    return <FileGlyph item={item} />;
  }

  return <img alt={item.name} decoding="async" loading="lazy" src={item.thumbnailUrl} onError={() => setFailed(true)} />;
}

function PreviewVisual({ item, large = false }) {
  const [failedPreviewId, setFailedPreviewId] = useState(null);
  const failed = failedPreviewId === item.id;

  if (item.kind === "pdf") {
    return <iframe title={item.name} src={item.fileUrl} />;
  }

  if (!failed && item.kind === "video") {
    return (
      <video
        autoPlay={large}
        controls
        poster={item.previewUrl}
        src={item.fileUrl}
        onError={() => setFailedPreviewId(item.id)}
      />
    );
  }

  if (failed && item.kind === "video") {
    if (large) {
      return <img alt={item.name} className="large-preview-image" decoding="async" src={item.previewUrl} />;
    }
    return <img alt={item.name} decoding="async" src={item.previewUrl} onError={() => setFailedPreviewId(item.id)} />;
  }

  if (!failed && isRasterPreviewKind(item.kind)) {
    const imageUrl = large ? item.fullPreviewUrl || item.previewUrl : item.previewUrl;
    if (large) {
      return <img alt={item.name} className="large-preview-image" decoding="async" src={imageUrl} onError={() => setFailedPreviewId(item.id)} />;
    }
    return <img alt={item.name} decoding="async" src={imageUrl} onError={() => setFailedPreviewId(item.id)} />;
  }

  return <FileGlyph item={item} large />;
}

function App() {
  const isMacApp = Boolean(window.messagesCleaner);
  const gridRef = useRef(null);
  const filteredItemsRef = useRef([]);
  const [roots, setRoots] = useState([]);
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [sortMode, setSortMode] = useState("largest");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [activeId, setActiveId] = useState(null);
  const [largePreviewId, setLargePreviewId] = useState(null);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_ITEMS);
  const [isScanning, setIsScanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState("");

  const scan = useCallback(async function scanImages() {
    if (!window.messagesCleaner) return;
    setIsScanning(true);
    setNotice("");
    setErrors([]);
    try {
      const result = await window.messagesCleaner.scanImages();
      setItems(result.items);
      setErrors(result.errors);
      setSelectedIds(new Set());
      setActiveId(null);
      setNotice(`Found ${formatter.format(result.items.length)} files.`);
    } catch (error) {
      setErrors([error.message || "Scan failed."]);
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    if (!window.messagesCleaner) return;
    window.messagesCleaner.getDefaultRoots().then(setRoots).catch((error) => {
      setErrors([error.message || "Could not load default folders."]);
    });
  }, []);

  useEffect(() => {
    if (window.messagesCleaner) {
      const timer = window.setTimeout(() => {
        scan();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [scan]);

  const sources = useMemo(() => {
    return Array.from(new Set(items.map(sourceName))).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    const next = items.filter((item) => {
      const matchesSource = sourceFilter === "all" || sourceName(item) === sourceFilter;
      const matchesKind = matchesFilterValue(item, kindFilter);
      const matchesQuery =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.path.toLowerCase().includes(term) ||
        item.folder.toLowerCase().includes(term) ||
        item.kindLabel.toLowerCase().includes(term) ||
        itemExtension(item).toLowerCase().includes(term) ||
        sourceName(item).toLowerCase().includes(term);
      return matchesSource && matchesKind && matchesQuery;
    });

    next.sort((a, b) => {
      if (sortMode === "oldest") return a.modifiedAt - b.modifiedAt;
      if (sortMode === "largest") return b.size - a.size;
      if (sortMode === "smallest") return a.size - b.size;
      if (sortMode === "type") {
        const extensionCompare = itemExtension(a).localeCompare(itemExtension(b));
        if (extensionCompare !== 0) return extensionCompare;
        const kindCompare = itemKind(a).localeCompare(itemKind(b));
        if (kindCompare !== 0) return kindCompare;
        return a.name.localeCompare(b.name);
      }
      return b.modifiedAt - a.modifiedAt;
    });

    return next;
  }, [items, kindFilter, query, sortMode, sourceFilter]);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const activeItem = useMemo(() => {
    return items.find((item) => item.id === activeId) || filteredItems[0] || null;
  }, [activeId, filteredItems, items]);
  const largePreviewItem = useMemo(() => {
    return items.find((item) => item.id === largePreviewId) || null;
  }, [items, largePreviewId]);

  useEffect(() => {
    document.body.classList.toggle("preview-open", Boolean(largePreviewId));
    return () => document.body.classList.remove("preview-open");
  }, [largePreviewId]);

  const totalSize = useMemo(() => items.reduce((sum, item) => sum + item.size, 0), [items]);
  const selectedSize = useMemo(() => selectedItems.reduce((sum, item) => sum + item.size, 0), [selectedItems]);
  const visibleItems = useMemo(() => filteredItems.slice(0, visibleLimit), [filteredItems, visibleLimit]);
  const filterMetrics = useMemo(() => {
    return filterDefinitions.map((definition) => {
      const filterValue = definition.filterValue || definition.value;
      const matchingItems = items.filter((item) => matchesFilterValue(item, filterValue));
      return {
        ...definition,
        count: matchingItems.length,
        filterValue,
        size: matchingItems.reduce((sum, item) => sum + item.size, 0),
      };
    });
  }, [items]);
  const storageBreakdown = useMemo(() => {
    return filterMetrics
      .filter((metric) => metric.count > 0)
      .sort((a, b) => b.size - a.size);
  }, [filterMetrics]);
  const currentSourceBreakdown = useMemo(() => {
    const groups = new Map();
    filteredItems.forEach((item) => {
      const source = sourceName(item);
      const risk = cleanupRisk(item);
      const current = groups.get(source) || {
        count: 0,
        risk,
        size: 0,
        source,
      };
      current.count += 1;
      current.size += item.size;
      groups.set(source, current);
    });
    return Array.from(groups.values()).sort((a, b) => b.size - a.size);
  }, [filteredItems]);
  const filteredSize = useMemo(() => filteredItems.reduce((sum, item) => sum + item.size, 0), [filteredItems]);

  function filterLabel(filterValue) {
    const metric = filterMetrics.find((entry) => entry.filterValue === filterValue);
    if (!metric) return "All files";
    return `${metric.label} (${formatter.format(metric.count)})`;
  }

  useEffect(() => {
    filteredItemsRef.current = filteredItems;
  }, [filteredItems]);

  function getGridColumnCount() {
    const grid = gridRef.current;
    if (!grid) return 1;
    const columns = window.getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean);
    return Math.max(columns.length, 1);
  }

  const moveActiveItem = useCallback(function moveActiveItem(key) {
    if (visibleItems.length === 0) return;
    const currentIndex = Math.max(
      0,
      visibleItems.findIndex((item) => item.id === activeItem?.id),
    );
    const columnCount = getGridColumnCount();
    const direction =
      key === "ArrowUp" ? -columnCount :
      key === "ArrowDown" ? columnCount :
      key === "ArrowLeft" ? -1 :
      1;
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), visibleItems.length - 1);
    setActiveId(visibleItems[nextIndex].id);
    if (largePreviewId) {
      setLargePreviewId(visibleItems[nextIndex].id);
    }
  }, [activeItem, largePreviewId, visibleItems]);

  useEffect(() => {
    function handleKeyDown(event) {
      const tagName = event.target?.tagName?.toLowerCase();
      const isFormField = ["input", "textarea", "select"].includes(tagName) || event.target?.isContentEditable;
      const isControlArea = event.target?.closest?.(".toolbar, .preview-actions, .permission-note, .load-more-row");

      if (event.key === "Escape" && largePreviewId) {
        event.preventDefault();
        closeLargePreview();
        return;
      }

      if (!isFormField && !isControlArea && ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        moveActiveItem(event.key);
        return;
      }

      if (event.code === "Space" && !isFormField && !isControlArea && activeItem && !largePreviewId) {
        event.preventDefault();
        openLargePreview(activeItem);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem, largePreviewId, moveActiveItem]);

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    setSelectedIds(new Set(visibleItems.map((item) => item.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function captureScrollAnchor(idsToRemove = new Set()) {
    const grid = gridRef.current;
    if (!grid) return null;

    const toolbarBottom = document.querySelector(".toolbar")?.getBoundingClientRect().bottom || 0;
    const targetTop = toolbarBottom + 16;
    const tiles = Array.from(grid.querySelectorAll(".image-tile"));
    const visibleTile = tiles.find((tile) => {
      const rect = tile.getBoundingClientRect();
      return rect.bottom > targetTop && rect.top < window.innerHeight;
    });

    if (!visibleTile) return { scrollY: window.scrollY };

    const anchorId = visibleTile.dataset.itemId;
    const filtered = filteredItemsRef.current;
    const anchorIndex = filtered.findIndex((item) => item.id === anchorId);
    const fallbackItem = filtered.slice(Math.max(anchorIndex, 0)).find((item) => !idsToRemove.has(item.id));

    return {
      fallbackId: fallbackItem?.id || null,
      id: idsToRemove.has(anchorId) ? fallbackItem?.id || null : anchorId,
      top: visibleTile.getBoundingClientRect().top,
      scrollY: window.scrollY,
    };
  }

  function restoreScrollAnchor(anchor) {
    if (!anchor) return;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const anchorId = anchor.id || anchor.fallbackId;
        const tile = anchorId ? gridRef.current?.querySelector(`[data-item-id="${CSS.escape(anchorId)}"]`) : null;
        if (!tile) {
          window.scrollTo({ top: anchor.scrollY, left: window.scrollX, behavior: "auto" });
          return;
        }

        const rect = tile.getBoundingClientRect();
        window.scrollBy({ top: rect.top - anchor.top, left: 0, behavior: "auto" });
      });
    });
  }

  function removeDeletedItems(deletedIds, deleteErrors = [], scrollAnchor = null) {
    const deleted = new Set(deletedIds);
    setItems((current) => current.filter((item) => !deleted.has(item.id)));
    setSelectedIds((current) => {
      const next = new Set(current);
      deleted.forEach((id) => next.delete(id));
      return next;
    });
    setActiveId((current) => (deleted.has(current) ? null : current));
    setLargePreviewId((current) => (deleted.has(current) ? null : current));
    setErrors(deleteErrors);
    restoreScrollAnchor(scrollAnchor);
  }

  async function deleteSelected() {
    if (!window.messagesCleaner || selectedItems.length === 0) return;
    const confirmed = window.confirm(
      `Move ${selectedItems.length} selected file${selectedItems.length === 1 ? "" : "s"} (${formatBytes(
        selectedSize,
      )}) to Trash?`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setNotice("");
    const idsToDelete = new Set(selectedItems.map((item) => item.id));
    const scrollAnchor = captureScrollAnchor(idsToDelete);
    try {
      const result = await window.messagesCleaner.trashItems(Array.from(idsToDelete));
      removeDeletedItems(result.deletedIds, result.errors, scrollAnchor);
      setNotice(`Moved ${formatter.format(result.deletedIds.length)} file${result.deletedIds.length === 1 ? "" : "s"} to Trash.`);
    } catch (error) {
      setErrors([error.message || "Delete failed."]);
    } finally {
      setIsDeleting(false);
    }
  }

  async function revealActive() {
    if (window.messagesCleaner && activeItem) {
      await window.messagesCleaner.revealItem(activeItem.id);
    }
  }

  function showContextMenu(event, item) {
    event.preventDefault();
    setActiveId(item.id);
    window.messagesCleaner.showItemMenu(item.id);
  }

  function openLargePreview(item) {
    if (!item) return;
    setActiveId(item.id);
    setLargePreviewId(item.id);
  }

  function closeLargePreview() {
    setLargePreviewId(null);
  }

  async function openFullDiskAccess() {
    if (window.messagesCleaner) {
      await window.messagesCleaner.openFullDiskAccess();
    }
  }

  if (!isMacApp) {
    return (
      <main className="fallback">
        <section>
          <p className="eyebrow">Mac app required</p>
          <h1>Messages Image Cleaner</h1>
          <p>Run this through Electron so it can ask macOS for permission to scan your local Library folders.</p>
          <code>npm run mac:dev</code>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Messages Image Cleaner</p>
          <h1>Browse and remove cached message clutter.</h1>
        </div>

        <button className="primary-action" type="button" onClick={scan} disabled={isScanning || isDeleting}>
          {isScanning ? "Scanning..." : "Rescan folders"}
        </button>

        <div className="stats">
          <div>
            <span>{formatter.format(items.length)}</span>
            <small>files</small>
          </div>
          <div>
            <span>{formatBytes(totalSize)}</span>
            <small>total</small>
          </div>
          <div>
            <span>{formatter.format(selectedItems.length)}</span>
            <small>selected</small>
          </div>
        </div>

        <div className="storage-breakdown">
          <h2>Storage by Type</h2>
          {storageBreakdown.map((metric) => {
            const percent = totalSize > 0 ? (metric.size / totalSize) * 100 : 0;
            return (
              <button
                className={`storage-row ${kindFilter === metric.filterValue ? "is-active" : ""}`}
                key={metric.id}
                type="button"
                onClick={() => {
                  setKindFilter(metric.filterValue);
                  setVisibleLimit(INITIAL_VISIBLE_ITEMS);
                }}
              >
                <span className="storage-row-header">
                  <strong>{metric.label}</strong>
                  <em>{formatBytes(metric.size)}</em>
                </span>
                <span className="storage-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(percent, metric.size > 0 ? 2 : 0)}%` }} />
                </span>
                <small>
                  {formatter.format(metric.count)} files · {sizeFormatter.format(percent)}%
                </small>
              </button>
            );
          })}
        </div>

        <div className="source-breakdown">
          <h2>Current Filter by Source</h2>
          {currentSourceBreakdown.length === 0 ? (
            <p>No files match the current filters.</p>
          ) : (
            currentSourceBreakdown.map((group) => {
              const percent = filteredSize > 0 ? (group.size / filteredSize) * 100 : 0;
              return (
                <button
                  className={`source-row source-row-${group.risk.tone} ${sourceFilter === group.source ? "is-active" : ""}`}
                  key={group.source}
                  type="button"
                  onClick={() => {
                    setSourceFilter(group.source);
                    setVisibleLimit(INITIAL_VISIBLE_ITEMS);
                  }}
                >
                  <span className="source-row-header">
                    <strong>{group.source}</strong>
                    <em>{formatBytes(group.size)}</em>
                  </span>
                  <span className="source-risk">
                    <b>{group.risk.label}</b>
                    <span>{group.risk.note}</span>
                  </span>
                  <small>
                    {formatter.format(group.count)} files · {sizeFormatter.format(percent)}%
                  </small>
                </button>
              );
            })
          )}
        </div>

        <div className="folder-list">
          <h2>Scanned Folders</h2>
          {roots.map((root) => (
            <div className="folder-row" key={root.path}>
              <span>{root.label}</span>
              <small>{root.path}</small>
            </div>
          ))}
        </div>

        <div className="permission-note">
          <span>If scans return nothing, add this app to Full Disk Access.</span>
          <button type="button" onClick={openFullDiskAccess}>
            Open Settings
          </button>
        </div>
      </aside>

      <section className="library">
        <header className="toolbar">
          <input
            aria-label="Search files"
            placeholder="Search name, folder, or source"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleLimit(INITIAL_VISIBLE_ITEMS);
            }}
          />
          <select
            aria-label="Filter by source"
            value={sourceFilter}
            onChange={(event) => {
              setSourceFilter(event.target.value);
              setVisibleLimit(INITIAL_VISIBLE_ITEMS);
            }}
          >
            <option value="all">All sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by file type"
            value={kindFilter}
            onChange={(event) => {
              setKindFilter(event.target.value);
              setVisibleLimit(INITIAL_VISIBLE_ITEMS);
            }}
          >
            <option value="all">All files</option>
            {filterMetrics.map((metric) => (
              <option key={metric.id} value={metric.filterValue}>
                {filterLabel(metric.filterValue)}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort files"
            value={sortMode}
            onChange={(event) => {
              setSortMode(event.target.value);
              setVisibleLimit(INITIAL_VISIBLE_ITEMS);
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="largest">Largest</option>
            <option value="smallest">Smallest</option>
            <option value="type">Type</option>
          </select>
          <button type="button" onClick={selectVisible} disabled={filteredItems.length === 0 || isDeleting}>
            Select visible
          </button>
          <button type="button" onClick={clearSelection} disabled={selectedItems.length === 0 || isDeleting}>
            Clear
          </button>
          <button className="danger-action" type="button" onClick={deleteSelected} disabled={selectedItems.length === 0 || isDeleting}>
            {isDeleting ? "Moving..." : `Trash ${selectedItems.length || ""}`.trim()}
          </button>
        </header>

        {(notice || errors.length > 0) && (
          <div className="status-strip">
            {notice && <span>{notice}</span>}
            {errors.map((error) => (
              <span className="status-error" key={error}>
                {error}
              </span>
            ))}
          </div>
        )}

        <div className="content-grid">
          <div className="image-grid" aria-label="File results" ref={gridRef}>
            {visibleItems.map((item) => (
              <button
                className={`image-tile ${selectedIds.has(item.id) ? "is-selected" : ""} ${activeItem?.id === item.id ? "is-active" : ""}`}
                data-item-id={item.id}
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                onContextMenu={(event) => showContextMenu(event, item)}
                onDoubleClick={() => openLargePreview(item)}
              >
                <TileVisual item={item} />
                <span
                  aria-label={`${selectedIds.has(item.id) ? "Deselect" : "Select"} ${item.name}`}
                  aria-pressed={selectedIds.has(item.id)}
                  className="check-control"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleSelected(item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.code === "Space") {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleSelected(item.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="checkmark">✓</span>
                </span>
                <span className="tile-meta">
                  <strong>{item.name}</strong>
                  <small>{formatBytes(item.size)} · {item.kindLabel} · {sourceName(item)}</small>
                  <small title={item.folder}>{item.folder}</small>
                </span>
              </button>
            ))}
            {!isScanning && filteredItems.length === 0 && (
              <div className="empty-state">
                <h2>No files found</h2>
                <p>Try rescanning after granting Full Disk Access, or clear the current filters.</p>
              </div>
            )}
            {visibleItems.length < filteredItems.length && (
              <div className="load-more-row">
                <button type="button" onClick={() => setVisibleLimit((current) => current + VISIBLE_ITEMS_STEP)}>
                  Load more ({formatter.format(filteredItems.length - visibleItems.length)} remaining)
                </button>
              </div>
            )}
          </div>

          <aside className="preview-pane">
            {activeItem ? (
              <>
                <div className="preview-image">
                  <PreviewVisual item={activeItem} />
                </div>
                <div className="preview-details">
                  <p className="eyebrow">{sourceName(activeItem)}</p>
                  <h2>{activeItem.name}</h2>
                  <dl>
                    <div>
                      <dt>Type</dt>
                      <dd>{activeItem.kindLabel}</dd>
                    </div>
                    <div>
                      <dt>Size</dt>
                      <dd>{formatBytes(activeItem.size)}</dd>
                    </div>
                    <div>
                      <dt>Modified</dt>
                      <dd>{formatDate(activeItem.modifiedAt)}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{activeItem.folder}</dd>
                    </div>
                    <div>
                      <dt>Full Path</dt>
                      <dd>{activeItem.path}</dd>
                    </div>
                  </dl>
                  <div className="preview-actions">
                    <button type="button" onClick={() => toggleSelected(activeItem.id)}>
                      {selectedIds.has(activeItem.id) ? "Deselect" : "Select"}
                    </button>
                    <button type="button" onClick={revealActive}>
                      Show in Finder
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-preview">Select a file to preview it.</div>
            )}
          </aside>
        </div>
      </section>
      {largePreviewItem && (
        <div className="large-preview-backdrop" onClick={closeLargePreview} onWheel={(event) => event.preventDefault()} role="presentation">
          <section className="large-preview" aria-modal="true" role="dialog" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p className="eyebrow">{sourceName(largePreviewItem)}</p>
                <h2>{largePreviewItem.name}</h2>
              </div>
              <button type="button" onClick={closeLargePreview} aria-label="Close preview">
                Close
              </button>
            </header>
            <div className="large-preview-media">
              <PreviewVisual item={largePreviewItem} large />
            </div>
            <footer>
              <span>{formatBytes(largePreviewItem.size)}</span>
              <span>{largePreviewItem.folder}</span>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
