import { useCallback, useEffect, useMemo, useState } from "react";
import { RawSeatmapProps, SeatDisplay } from "./RawSeatmap.types";

import "./RawSeatmap.scss";
import svgPanZoom from "svg-pan-zoom";
import _ from "lodash";
import { usePrevious } from "../../../utils/usePrevious";
import { SeatmapControl } from "../../../types/SeatmapControl.types";

export const RawSeatmap = ({
  availableSeats,
  selectedSeatIds,
  svg,
  zones = [],
  onSeatSelect,
  onSeatDeselect,
  onSeatHover,
  onSeatHoverEnd,
  allowDragAndPan = true,
  showZoomControls = true,
  selectionMode = null,
  leftControls,
  rightControls,
}: RawSeatmapProps) => {
  const [svgString, setSvgContent] = useState<string>("");
  const [svgFetchingError, setSvgFetchingError] = useState(false);
  const [mapNeedsPainting, setMapNeedsPainting] = useState(false);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    seat?: SeatDisplay;
  }>({ visible: false, x: 0, y: 0 });

  // Selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const previousState = usePrevious({
    svgString,
    selectedSeatIds,
    availableSeats,
  });

  const seatSelected = useCallback(
    (seat: SeatDisplay) => selectedSeatIds && selectedSeatIds.includes(seat.id),
    [selectedSeatIds]
  );

  const matchingSeat = useCallback(
    (circle: SVGElement) => {
      // Находим все места, которые подходят под этот элемент
      const matchingSeats = availableSeats.filter((seat) => {
        try {
          return circle.matches(seat.cssSelector);
        } catch {
          return false;
        }
      });
      
      if (matchingSeats.length === 0) return undefined;
      
      // Предпочитаем места с назначенными данными
      const assignedSeat = matchingSeats.find(seat => 
        seat.objectType && (
          seat.objectType !== 'seat' || // не место, но с типом
          (seat.row && seat.place) // место с рядом и местом
        )
      );
      
      // Возвращаем назначенное место или первое найденное
      return assignedSeat || matchingSeats[0];
    },
    [availableSeats]
  );

  // Функция для получения координат мыши относительно SVG
  const getSVGCoordinates = useCallback((event: MouseEvent) => {
    const svgElement = document.querySelector('.seatmap__svg svg');
    if (!svgElement) return { x: 0, y: 0 };
    
    const rect = svgElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    return { x, y };
  }, []);

  const getSVGPanZoom = useCallback(
    () =>
      svgPanZoom(".seatmap__svg svg", {
        dblClickZoomEnabled: false,
        mouseWheelZoomEnabled: true,
        zoomScaleSensitivity: 0.5,
      }),
    []
  );

  // Fetch the SVG content from the provided URL
  useEffect(() => {
    fetch(svg)
      .then((res) => {
        if (res.ok) {
          return res.text();
        }
        throw new Error("Unable to fetch SVG");
      })
      .then((text) => setSvgContent(text))
      .catch((err) => {
        setSvgFetchingError(true);
        console.error("Failed to load SVG:", err);
      });
  }, [svg]);

  // For a given SVG element, set the colour based on the seat's availability and selection status
  const setSeatColour = useCallback(
    (element: SVGElement, seat?: SeatDisplay) => {
      // Проверяем что элемент все еще существует в DOM
      if (!element.parentElement) {
        return;
      }
      
      // Очищаем все классы состояний
      element.classList.remove("seat--unavailable", "seat--drag-preview", "selecto-selection", "selecto-drag", "selecto-hover");
      
      if (seat) {
        if (selectedSeatIds?.includes(seat.id)) {
          element.classList.add("seat--selected");
          element.classList.remove("seat--available");
        } else {
          element.classList.add("seat--available");
          element.classList.remove("seat--selected");
        }

        // Определяем цвет на основе зоны для обработанных объектов
        let zoneColor = null;
        if (seat.zone) {
          const zone = zones.find(z => z.id === seat.zone);
          if (zone) {
            zoneColor = zone.color;
          }
        }

        // Применяем цвет зоны для обработанных объектов, но только если место не выделено
        if (!selectedSeatIds?.includes(seat.id)) {
          if (zoneColor && seat.objectType && (
            seat.objectType !== 'seat' || // не место, но с типом
            (seat.row && seat.place) // место с рядом и местом
          )) {
            element.setAttribute(
              "style",
              `fill: ${zoneColor} !important; stroke: ${zoneColor} !important;`
            );
          } else if (seat.color) {
            // Fallback на старую логику для совместимости
            element.setAttribute(
              "style",
              `stroke: ${seat.color} !important; fill: ${seat.color} !important;`
            );
          }
        } else {
          // Для выделенных мест убираем inline стили, чтобы CSS классы работали
          element.removeAttribute("style");
        }
      } else {
        element.classList.add("seat--unavailable");
        element.classList.remove("seat--available", "seat--selected");
      }
    },
    [seatSelected, selectedSeatIds, zones]
  );

  // Set the initial colour of each seat on the SVG
  useEffect(() => {
    if (!svgString || svgFetchingError) {
      return;
    }

    if (mapNeedsPainting) {
      const elements = document.querySelectorAll<SVGElement>(
        ".seatmap__svg circle, .seatmap__svg path, .seatmap__svg ellipse, .seatmap__svg rect, .seatmap__svg polygon"
      );

      elements.forEach((element) => {
        const foundSeat = matchingSeat(element);
        setSeatColour(element, foundSeat);
      });

      setMapNeedsPainting(false);
    }
  }, [
    mapNeedsPainting,
    matchingSeat,
    setSeatColour,
    svgString,
    svgFetchingError,
    zones, // Добавляем zones в зависимости
  ]);

  // Перерисовываем карту при изменении зон
  useEffect(() => {
    if (svgString && !svgFetchingError) {
      setMapNeedsPainting(true);
    }
  }, [zones, svgString, svgFetchingError]);

  // Очищаем выделение при изменении selectedSeatIds
  useEffect(() => {
    if (selectedSeatIds && selectedSeatIds.length === 0) {
      // Очищаем все классы выделения
      const elements = document.querySelectorAll<SVGElement>(
        ".seatmap__svg circle, .seatmap__svg path, .seatmap__svg ellipse, .seatmap__svg rect, .seatmap__svg polygon"
      );
      elements.forEach(element => {
        element.classList.remove('seat--selected', 'selecto-selection', 'selecto-drag', 'selecto-hover', 'seat--drag-preview');
      });
    }
  }, [selectedSeatIds]);

  // Setup the pan and zoom functionality on the SVG element
  useEffect(() => {
    if (!svgString || svgFetchingError) return;

    const panZoom = getSVGPanZoom();
    panZoom.resize();
    panZoom.center();
    panZoom.fit();
  }, [svgString, getSVGPanZoom, svgFetchingError]);

  // Update the pan and zoom functionality if the related props change
  useEffect(() => {
    if (!svgString || svgFetchingError) return;

    const panZoom = getSVGPanZoom();
    if (!allowDragAndPan) {
      panZoom.disablePan();
    } else {
      panZoom.enablePan();
    }
  }, [svgString, allowDragAndPan, getSVGPanZoom, svgFetchingError]);

  // When the state changes, the event listeners won't naturally pick up the state changes.
  // Consequently, the event listeners need to be replaced with new ones
  useEffect(() => {
    if (!svgString || svgFetchingError) return;

    let clickTimeout: NodeJS.Timeout | null = null;

    // Callback to handle click events on the SVG elements
    const handleClick = (e: MouseEvent) => {
      // Полностью отключаем обработку кликов в режиме drag
      if (selectionMode === 'drag') {
        return;
      }

      // Предотвращаем конфликты с drag selection
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }

      // Не обрабатываем клики если идет выделение
      if (isSelecting) {
        return;
      }

      clickTimeout = setTimeout(() => {
        // Дополнительная проверка - убеждаемся что режим все еще не drag
        if (selectionMode === 'drag') {
          return;
        }

        const target = e.target as SVGElement;
        
        // Проверяем что элемент все еще существует в DOM
        if (!target.parentElement) {
          return;
        }
        
        const seat = matchingSeat(target);

        if (seat) {
          // Проверяем что элемент не в процессе drag selection или Selecto
          if (target.classList.contains('selecto-selection') || 
              target.classList.contains('selecto-drag') ||
              target.classList.contains('selecto-hover') ||
              target.classList.contains('seat--drag-preview') ||
              document.querySelector('.selecto-selection') ||
              document.querySelector('.selecto-drag') ||
              document.querySelector('.selecto-hover')) {
            return;
          }

          // Дополнительная проверка - если user-select отключен, значит Selecto активен
          if (document.body.style.userSelect === 'none') {
            return;
          }

          // Проверяем что элемент не был изменен другими процессами
          if (target.style.transform || target.style.animation) {
            return;
          }

          if (seatSelected(seat) && onSeatDeselect) {
            onSeatDeselect(seat);
          } else if (onSeatSelect) {
            onSeatSelect(seat);
          }
        }
        clickTimeout = null;
      }, 250); // Еще больше увеличиваем задержку для полной стабилизации
    };

    // Callback to handle mouse down for selection
    const handleMouseDown = (e: MouseEvent) => {
      // Проверяем что клик по пустому месту (не по элементу) и включен режим drag
      if (e.target === document.querySelector('.seatmap__svg svg') && selectionMode === 'drag') {
        // Очищаем предыдущее выделение при начале нового
        if (onSeatDeselect && selectedSeatIds && selectedSeatIds.length > 0) {
          const currentSelectedSeats = availableSeats.filter(seat => 
            selectedSeatIds.includes(seat.id)
          );
          onSeatDeselect(currentSelectedSeats);
        }
        
        // Принудительно очищаем все классы выделения
        const selectoElements = document.querySelectorAll('.selecto-selection, .selecto-drag, .selecto-hover, .seat--drag-preview');
        selectoElements.forEach(element => {
          element.classList.remove('selecto-selection', 'selecto-drag', 'selecto-hover', 'seat--drag-preview');
        });
        
        const { x, y } = getSVGCoordinates(e);
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectionEnd({ x, y });
        e.preventDefault();
      }
    };

    // Callback to handle mouse move for selection
    const handleMouseMove = (e: MouseEvent) => {
      if (isSelecting && selectionMode === 'drag') {
        const { x, y } = getSVGCoordinates(e);
        setSelectionEnd({ x, y });
      }
    };

    // Callback to handle mouse up for selection
    const handleMouseUp = (e: MouseEvent) => {
      if (isSelecting && selectionMode === 'drag') {
        const { x: endX, y: endY } = getSVGCoordinates(e);
        
        // Проверяем, что рамка достаточно большая
        const minSelectionSize = 5;
        if (Math.abs(endX - selectionStart.x) > minSelectionSize || Math.abs(endY - selectionStart.y) > minSelectionSize) {
          // Вычисляем область выделения
          const selectionRect = {
            x: Math.min(selectionStart.x, endX),
            y: Math.min(selectionStart.y, endY),
            width: Math.abs(endX - selectionStart.x),
            height: Math.abs(endY - selectionStart.y)
          };

          // Находим места в области выделения
          const svgElement = document.querySelector('.seatmap__svg svg');
          if (svgElement) {
            const selectedElements = document.querySelectorAll<SVGElement>(
              '.seatmap__svg circle, .seatmap__svg path, .seatmap__svg ellipse, .seatmap__svg rect, .seatmap__svg polygon'
            );

            const selectedSeats: SeatDisplay[] = [];
            selectedElements.forEach(element => {
              const rect = element.getBoundingClientRect();
              const svgRect = svgElement.getBoundingClientRect();
              
              const elementX = rect.left - svgRect.left;
              const elementY = rect.top - svgRect.top;
              const elementWidth = rect.width;
              const elementHeight = rect.height;

              // Проверяем пересечение
              if (elementX < selectionRect.x + selectionRect.width &&
                  elementX + elementWidth > selectionRect.x &&
                  elementY < selectionRect.y + selectionRect.height &&
                  elementY + elementHeight > selectionRect.y) {
                
                const seat = matchingSeat(element);
                if (seat) {
                  selectedSeats.push(seat);
                }
              }
            });

            // Выделяем найденные места
            if (selectedSeats.length > 0 && onSeatSelect) {
              onSeatSelect(selectedSeats);
            }
          }
        }

        setIsSelecting(false);
        setSelectionStart({ x: 0, y: 0 });
        setSelectionEnd({ x: 0, y: 0 });
      }
    };

    // Callback to handle hover events on the SVG elements
    const handleHover = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      
      // Проверяем что элемент все еще существует в DOM
      if (!target.parentElement) {
        return;
      }
      
      const seat = matchingSeat(target);

      if (seat) {
        if (e.type === "mouseover") {
          // Отладка: выводим информацию о найденном месте
          // Tooltip found seat
          
          // Показываем tooltip
          setTooltip({
            visible: true,
            x: e.clientX + 10, // Небольшой отступ от курсора
            y: e.clientY - 10,
            seat: seat
          });
          
          // Вызываем оригинальный callback
          if (onSeatHover) {
            onSeatHover(seat);
          }
        } else if (e.type === "mouseout") {
          // Скрываем tooltip
          setTooltip(prev => ({ ...prev, visible: false }));
          
          // Вызываем оригинальный callback
          if (onSeatHoverEnd) {
            onSeatHoverEnd(seat);
          }
        }
      }
    };

    // Используем более специфичный селектор, включая элементы без ID
    const elements = document.querySelectorAll<SVGElement>(
      ".seatmap__svg circle, .seatmap__svg path, .seatmap__svg ellipse, .seatmap__svg rect, .seatmap__svg polygon"
    );

    // Добавляем обработчики для выделения рамкой к SVG элементу
    const svgElement = document.querySelector('.seatmap__svg svg');
    if (svgElement) {
      svgElement.removeEventListener("mousedown", handleMouseDown);
      svgElement.removeEventListener("mousemove", handleMouseMove);
      svgElement.removeEventListener("mouseup", handleMouseUp);
      
      svgElement.addEventListener("mousedown", handleMouseDown);
      svgElement.addEventListener("mousemove", handleMouseMove);
      svgElement.addEventListener("mouseup", handleMouseUp);
      
      // Устанавливаем курсор в зависимости от режима
      svgElement.style.cursor = selectionMode === 'drag' ? "crosshair" : "grab";
    }

    elements.forEach((target) => {
      // Удаляем старые обработчики
      target.removeEventListener("click", handleClick);
      target.removeEventListener("mouseover", handleHover);
      target.removeEventListener("mouseout", handleHover);

      // Добавляем новые обработчики
      // Используем click вместо pointerdown для лучшей совместимости с drag selection
      target.addEventListener("click", handleClick);
      target.addEventListener("mouseover", handleHover);
      target.addEventListener("mouseout", handleHover);
      
      // Добавляем атрибуты для лучшей работы с селекторами
      target.style.cursor = selectionMode === 'drag' ? "crosshair" : "pointer";
    });

    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      
      // Удаляем обработчики выделения рамкой
      if (svgElement) {
        svgElement.removeEventListener("mousedown", handleMouseDown);
        svgElement.removeEventListener("mousemove", handleMouseMove);
        svgElement.removeEventListener("mouseup", handleMouseUp);
      }
      
      // Удаляем обработчики с отдельных элементов
      elements.forEach((target) => {
        target.removeEventListener("click", handleClick);
        target.removeEventListener("mouseover", handleHover);
        target.removeEventListener("mouseout", handleHover);
      });
    };
  }, [
    svgString,
    svgFetchingError,
    onSeatDeselect,
    onSeatSelect,
    onSeatHover,
    onSeatHoverEnd,
    matchingSeat,
    seatSelected,
    isSelecting,
    selectionStart,
    selectionMode,
    getSVGCoordinates,
  ]);

  // When the available seats change, repaint the SVG.
  // Doing this for every seat is highly time-consuming, so we optimize the paint by
  // only repainting the seats that have changed.
  useEffect(() => {
    if (!svgString || svgFetchingError) return;

    const changedSeats = availableSeats.filter((seat) => {
      const previousSeat = previousState?.availableSeats.find(
        (s) => s.id === seat.id
      );
      return !_.isEqual(seat, previousSeat);
    });

    // If the seat has changed, repaint the associated SVG element
    for (const seat of changedSeats) {
      const seatDisplayElement = document.querySelector<SVGElement>(
        seat.cssSelector
      );
      if (!seatDisplayElement) continue;
      setSeatColour(seatDisplayElement, seat);
    }
  }, [
    availableSeats,
    previousState?.availableSeats,
    setSeatColour,
    svgString,
    svgFetchingError,
  ]);

  // Update the style of seats that have been selected
  useEffect(() => {
    // Find all differences between the previous and current selected seats
    let changedSeatIds = selectedSeatIds || [];
    if (selectedSeatIds && previousState?.selectedSeatIds) {
      changedSeatIds = selectedSeatIds
        .filter(
          (x) =>
            previousState.selectedSeatIds &&
            !previousState.selectedSeatIds.includes(x)
        )
        .concat(
          previousState.selectedSeatIds.filter(
            (x) => !selectedSeatIds.includes(x)
          )
        );
    }

    for (const seatId of changedSeatIds) {
      const seatDisplay = availableSeats.find((seat) => seat.id === seatId);
      if (!seatDisplay) continue;

      const seatDisplayElement = document.querySelector<SVGElement>(
        seatDisplay.cssSelector
      );

      if (!seatDisplayElement) continue;

      setSeatColour(seatDisplayElement, seatDisplay);
    }
  }, [
    availableSeats,
    previousState?.selectedSeatIds,
    selectedSeatIds,
    setSeatColour,
  ]);

  // Take a SeatmapControl object and return the appropriate JSX element
  // This allows users to specify if the control group should be styled or not
  const generateSeatmapControl = (control: SeatmapControl, key?: string | number) => {
    if (control && typeof control === "object" && "style" in control) {
      return (
        <div
          key={key}
          className={
            "seatmap__action-group" +
            (control.style === "none" ? " seatmap__action-group--unstyled" : "")
          }
        >
          {control.control}
        </div>
      );
    }
    return <div key={key} className="seatmap__action-group">{control}</div>;
  };

  // We need to memoize the main SVG content separately from the rest of the component to ensure
  // that it NEVER changes unless the SVG itself changes.
  // This is because the SVG pan and zoom library (as well as our seat painting method)
  // will not work correctly if the SVG content changes.
  const memoizedSvg = useMemo(() => {
    setMapNeedsPainting(true);
    return (
      <div
        className="seatmap__svg"
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    );
  }, [svgString]);

  // Memoize the main HTML structure to avoid unnecessary re-renders
  const returnValue = useMemo(() => {
    const handleZoomIn = () => {
      getSVGPanZoom().zoomIn();
    };

    const handleZoomReset = () => {
      const panZoom = getSVGPanZoom();
      panZoom.resize();
      panZoom.center();
      panZoom.fit();
    };

    const handleZoomOut = () => {
      getSVGPanZoom().zoomOut();
    };

    return (
      <div className="seatmap">
        <div className="seatmap__actions seatmap__actions--left">
          {showZoomControls && (
            <div className="seatmap__action-group">
              <button
                type="button"
                className="seatmap__action"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <svg
                  className="seatmap__icon seatmap__icon--zoom-in"
                  viewBox="0 -960 960 960"
                >
                  <title>Zoom In</title>
                  <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
                </svg>
              </button>
              <button
                type="button"
                className="seatmap__action"
                onClick={handleZoomReset}
                title="Reset Zoom"
              >
                <svg
                  className="seatmap__icon seatmap__icon--reset"
                  viewBox="0 -960 960 960"
                >
                  <title>Reset zoom</title>
                  <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
                </svg>
              </button>
              <button
                type="button"
                className="seatmap__action"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <svg
                  className="seatmap__icon seatmap__icon--zoom-out"
                  viewBox="0 -960 960 960"
                >
                  <title>Zoom Out</title>
                  <path d="M200-440v-80h560v80H200Z" />
                </svg>
              </button>
            </div>
          )}
          {leftControls?.map((control, index) => 
            generateSeatmapControl(control, index)
          )}
        </div>
        {memoizedSvg}
        
        {/* Selection rectangle */}
        {isSelecting && (
          <div
            className="seatmap__selection-rect"
            style={{
              position: 'absolute',
              left: Math.min(selectionStart.x, selectionEnd.x),
              top: Math.min(selectionStart.y, selectionEnd.y),
              width: Math.abs(selectionEnd.x - selectionStart.x),
              height: Math.abs(selectionEnd.y - selectionStart.y),
              border: '2px dashed #007bff',
              backgroundColor: 'rgba(0, 123, 255, 0.1)',
              pointerEvents: 'none',
              zIndex: 100,
            }}
          />
        )}
        
        <div className="seatmap__actions seatmap__actions--right">
          {rightControls?.map((control, index) => 
            generateSeatmapControl(control, index)
          )}
        </div>
        
        {/* Tooltip */}
        {tooltip.visible && tooltip.seat && (
          <div
            className="seatmap__tooltip"
            style={{
              position: 'fixed',
              left: tooltip.x,
              top: tooltip.y,
              zIndex: 1000,
            }}
          >
            <div className="seatmap__tooltip-content">
              {tooltip.seat.objectType === 'seat' && tooltip.seat.row && tooltip.seat.place ? (
                <>
                  <div className="seatmap__tooltip-row">
                    <strong>Ряд:</strong> {tooltip.seat.row}
                  </div>
                  <div className="seatmap__tooltip-row">
                    <strong>Место:</strong> {tooltip.seat.place}
                  </div>
                </>
              ) : (
                <div className="seatmap__tooltip-row">
                  <strong>Тип:</strong> {tooltip.seat.objectType || 'не назначен'}
                </div>
              )}
              {tooltip.seat.zone && (
                <div className="seatmap__tooltip-row">
                  <strong>Зона:</strong> {zones.find(z => z.id === tooltip.seat.zone)?.name || tooltip.seat.zone}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, [
    leftControls,
    rightControls,
    getSVGPanZoom,
    memoizedSvg,
    showZoomControls,
    tooltip,
    isSelecting,
    selectionStart,
    selectionEnd,
  ]);

  // If the SVG could not be fetched, return an error message
  if (svgFetchingError) {
    return (
      <div className="seatmap">
        <div className="seatmap__error">
          ERROR: Unable to fetch SVG from the given URL: {svg}
        </div>
      </div>
    );
  }

  return returnValue;
};
