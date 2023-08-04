import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
  UniqueIdentifier,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { theme } from "../../../theme/customTheme";
import {
  SortDirection,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
} from "@mui/material";
import { createPortal } from "react-dom";

export function HeaderItem({
  id,
  children,
  rowId,
  sortDirection,
  width,
  dragOverlay,
}: {
  id: UniqueIdentifier;
  children: React.ReactNode;
  rowId: string;
  sortDirection: SortDirection | undefined;
  width?: string;
  dragOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    border: "1px solid  gray",
    ...(!dragOverlay && { borderTop: "none" }),
    backgroundColor: theme.table_header,
    width: width,
    ...(dragOverlay && { width: document.getElementById(rowId)?.offsetWidth }),
    ...(dragOverlay && { cursor: "grabbing" }),
  };

  return (
    <TableCell
      align="center"
      style={style}
      ref={setNodeRef}
      id={!dragOverlay ? rowId : undefined}
      sortDirection={sortDirection}
      {...attributes}
      {...listeners}
    >
      {children}
    </TableCell>
  );
}

export default function TableHeader({
  headers,
  setHeaders,
  isCollapsible,
  order,
  orderBy,
  setOrder,
  setOrderBy,
  tableName,
}: TEATable.TableHeaderProps) {

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const items = useMemo(
    () => headers.map(() => crypto.randomUUID() as UniqueIdentifier),
    [headers]
  );

  const mouseXStart = useRef<number | null>(null);
  const activeIndex = useRef<number | null>(null);
  const [disableSort, setDisableSort] = useState<boolean>(false);
  const headRef = useRef<HTMLTableRowElement>(null);

  const onResizeStart = (
    index: number,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    activeIndex.current = index;
    mouseXStart.current = e.clientX;
  };

  const minWidth = 150;

  const findValidNeighbor = (
    index: number,
    diff: number
  ): {
    element: HTMLElement;
    index: number;
  } | null => {
    const neighborIndex = diff > 0 ? index + 1 : index - 1;
    const neighbor = document.getElementById(
      `${tableName}-tablecell-${neighborIndex}`
    );
    if (!neighbor) return null;
    const neighborWidth = neighbor.offsetWidth;
    if (neighborWidth > minWidth + Math.abs(diff)) {
      return { element: neighbor, index: neighborIndex };
    }
    return findValidNeighbor(neighborIndex, diff);
  };

  const mouseMove = (e: MouseEvent) => {
    if (activeIndex.current === null || mouseXStart.current === null) return;
    const diff = e.clientX - mouseXStart.current;
    if (diff === 0) return;
    const elementIndex =
      diff > 0 ? activeIndex.current : activeIndex.current + 1;
    const elementMustGrow = document.getElementById(
      `${tableName}-tablecell-${elementIndex}`
    );
    const elementMustShrink = findValidNeighbor(elementIndex, diff);
    if (!elementMustGrow || !elementMustShrink) return;
    const growW = elementMustGrow.offsetWidth + Math.abs(diff);
    const shrinkW = elementMustShrink.element.offsetWidth - Math.abs(diff);
    if (growW > 0 && shrinkW > 0 && shrinkW > minWidth) {
      elementMustGrow.style.width = growW + "px";
      elementMustShrink.element.style.width = shrinkW + "px";
      headers[elementIndex].width = growW + "px";
      headers[elementMustShrink.index].width = shrinkW + "px";
      mouseXStart.current = e.clientX;
    }
  };

  const mouseUp = () => {
    activeIndex.current = null;
    mouseXStart.current = null;
    setDisableSort(false);
  };

  useEffect(() => {
    if (!setHeaders) return;
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);
    return () => {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  function truncateString(str: string, maxLength: number) {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength) + "...";
  }

  const HeaderCol = (id: UniqueIdentifier, index: number) => (
    <HeaderItem
      key={id}
      id={id}
      rowId={`${tableName}-tablecell-${index}`}
      sortDirection={orderBy === headers[index].key ? order : false}
      dragOverlay
    >
      <TableSortLabel
        active={orderBy === headers[index].key}
        direction={orderBy === headers[index].key ? order : "asc"}
        onClick={() => {
          if (typeof headers[index].key === "string") {
            setOrderBy(headers[index].key as string);
          }
          if (orderBy === headers[index].key) {
            if (order === "asc") {
              setOrder("desc");
            } else {
              setOrder("asc");
            }
          } else {
            setOrder("asc");
          }
        }}
      >
        {headers[index].value}
      </TableSortLabel>
      {index !== headers.length - 1 && setHeaders && (
        <div
          onMouseDown={(e) => onResizeStart(index, e)}
          onMouseOver={() => setDisableSort(true)}
          onMouseOut={() =>
            activeIndex.current === null ? setDisableSort(false) : null
          }
          className="resize-handle"
        />
      )}
    </HeaderItem>
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  return (
    <TableHead sx={{ backgroundColor: theme.table_header }}>
      <TableRow
        ref={headRef}
        sx={{
          width: "100%",
          // borderColor: "gray",
          backgroundColor: theme.table_header,
        }}
      >
        {isCollapsible && (
          <TableCell
            sx={{
              width: "66px",
              backgroundColor: theme.table_header,
              borderColor: "gray",
              borderRight: "1px solid gray",
            }}
          />
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          autoScroll={false}
          onDragStart={(event) => {
            const { active } = event;
            if (active) {
              setActiveId(active.id);
            }
          }}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={(event) => {
            const { active, over } = event;

            if (setHeaders && active?.id && over?.id && active.id !== over.id) {
              setHeaders((prev) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(prev, oldIndex, newIndex);
              });
            }
            setActiveId(null);
          }}
        >
          <SortableContext
            items={items}
            disabled={disableSort || !setHeaders}
            strategy={horizontalListSortingStrategy}
          >
            {createPortal(
              <DragOverlay zIndex={5000}>
                {activeId ? HeaderCol(activeId, items.indexOf(activeId)) : null}
              </DragOverlay>,
              document.body
            )}
            {items.map((id, index) => (
              <HeaderItem
                key={id}
                id={id}
                rowId={`${tableName}-tablecell-${index}`}
                sortDirection={orderBy === headers[index].key ? order : false}
                width={headers[index].width}
              >
                <TableSortLabel
                  active={orderBy === headers[index].key}
                  direction={orderBy === headers[index].key ? order : "asc"}
                  onClick={() => {
                    if (typeof headers[index].key === "string") {
                      setOrderBy(headers[index].key as string);
                    }
                    if (orderBy === headers[index].key) {
                      if (order === "asc") {
                        setOrder("desc");
                      } else {
                        setOrder("asc");
                      }
                    } else {
                      setOrder("asc");
                    }
                  }}
                >
                  {truncateString(headers[index].value, 10)}
                </TableSortLabel>
                {index !== headers.length - 1 && setHeaders && (
                  <div
                    onMouseDown={(e) => onResizeStart(index, e)}
                    onMouseOver={() => setDisableSort(true)}
                    onMouseOut={() =>
                      activeIndex.current === null
                        ? setDisableSort(false)
                        : null
                    }
                    className="resize-handle"
                  />
                )}
              </HeaderItem>
            ))}
          </SortableContext>
        </DndContext>
      </TableRow>
    </TableHead>
  );
}
