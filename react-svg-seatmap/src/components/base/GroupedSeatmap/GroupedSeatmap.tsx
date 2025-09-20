import { useMemo, useState, useEffect } from "react";
import { GroupedSeat, GroupedSeatmapProps } from "./GroupedSeatmap.types";

import { RawSeatmap } from "../RawSeatmap/RawSeatmap";
import { SeatDisplay } from "../RawSeatmap/RawSeatmap.types";
import Selecto from "react-selecto";

export const GroupedSeatmap = ({
  availableSeats,
  selectedSeatIds,
  svg,
  zones,
  displayGroupMapping,
  onSeatSelect,
  onSeatDeselect,
  rightControls,
  leftControls,
  withDragSelection = true,
  withGroupSelection = true,
}: GroupedSeatmapProps) => {
  const [selectionMethod, setSelectionMethod] = useState<
    "group" | "drag" | null
  >(null);
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);

  // Очищаем выделение Selecto при изменении selectedSeatIds
  useEffect(() => {
    if (selectedSeatIds.length === 0) {
      // Очищаем все классы выделения Selecto
      const selectoElements = document.querySelectorAll('.selecto-selection, .selecto-drag, .selecto-hover, .seat--drag-preview');
      selectoElements.forEach(element => {
        element.classList.remove('selecto-selection', 'selecto-drag', 'selecto-hover', 'seat--drag-preview');
      });
    }
  }, [selectedSeatIds]);

  const findSeatsInGroup = (seat: GroupedSeat, group: string) => {
    const groupValue = seat?.selectionGroups?.[group];

    const groupSeats =
      typeof groupValue === "object"
        ? availableSeats.filter(
            (s) =>
              sameGroup(s, seat, group) && sameGroup(s, seat, groupValue.parent)
          )
        : availableSeats.filter((s) => sameGroup(s, seat, group));

    return groupSeats;
  };

  const sameGroup = (
    seatA: GroupedSeat,
    seatB: GroupedSeat,
    groupName: string
  ) => {
    let seatAGroupValue = seatA.selectionGroups?.[groupName];
    if (typeof seatAGroupValue === "object") {
      seatAGroupValue = seatAGroupValue.value;
    }
    const seatBGroupValue = seatB.selectionGroups?.[groupName];
    if (typeof seatBGroupValue === "object") {
      return seatAGroupValue === seatBGroupValue.value;
    }
    return seatAGroupValue === seatBGroupValue;
  };

  const handleSeatSelect = (changedSeat: SeatDisplay, selected: boolean) => {
    // Add the selected seat to the state value
    const seatObject = availableSeats.find((s) => s.id === changedSeat.id);
    if (!seatObject) return;

    let changedSeats: GroupedSeat[] = [seatObject];

    // If group selection is enabled, add all seats in the current group to the selected seats
    if (selectionMethod === "group" && currentGroup) {
      const groupSeats = findSeatsInGroup(seatObject, currentGroup);

      changedSeats = [...changedSeats, ...groupSeats];
    }

    if (selected && onSeatSelect) {
      onSeatSelect(changedSeats);
    } else if (!selected && onSeatDeselect) {
      onSeatDeselect(changedSeats);
    }
  };

  const handleSeatMultiSelect = (e: {
    added: (HTMLElement | SVGElement)[];
    removed: (HTMLElement | SVGElement)[];
  }) => {
    const selectedSeats: GroupedSeat[] = [];
    const deselectedSeats: GroupedSeat[] = [];
    
    // Обрабатываем добавленные элементы
    if (e.added && e.added.length > 0) {
      e.added.forEach((element: HTMLElement | SVGElement) => {
        // Find the seat object associated with the selected element
        const seatObject = availableSeats.find((s) => {
          try {
            return element.matches(s.cssSelector);
          } catch {
            return false;
          }
        });
        
        if (!seatObject) return;

        // Добавляем класс для отметки что элемент был выбран через drag
        element.classList.add("selecto-selection");
        
        // Add the selected seat to the list of selected seats
        selectedSeats.push(seatObject);
      });
    }
    
    // Обрабатываем удаленные элементы
    if (e.removed && e.removed.length > 0) {
      e.removed.forEach((element: HTMLElement | SVGElement) => {
        // Find the seat object associated with the deselected element
        const seatObject = availableSeats.find((s) => {
          try {
            return element.matches(s.cssSelector);
          } catch {
            return false;
          }
        });
        
        if (!seatObject) return;

        // Убираем класс выделения
        element.classList.remove("selecto-selection");
        
        // Add the deselected seat to the list of deselected seats
        deselectedSeats.push(seatObject);
      });
    }

    // Очищаем класс selecto-selection через короткое время
    setTimeout(() => {
      if (e.added) {
        e.added.forEach((element: HTMLElement | SVGElement) => {
          element.classList.remove("selecto-selection");
        });
      }
    }, 100);
    
    // Вызываем соответствующие колбэки
    if (selectedSeats.length > 0 && onSeatSelect) {
      onSeatSelect(selectedSeats);
    }
    
    if (deselectedSeats.length > 0 && onSeatDeselect) {
      onSeatDeselect(deselectedSeats);
    }
  };

  const handleHoverMultiSelect = (e: {
    added: (HTMLElement | SVGElement)[];
    removed: (HTMLElement | SVGElement)[];
  }) => {
    // Добавляем временную подсветку для preview выделения
    if (e.added) {
      e.added.forEach((element: HTMLElement | SVGElement) => {
        element.classList.add("seat--drag-preview");
      });
    }
    
    if (e.removed) {
      e.removed.forEach((element: HTMLElement | SVGElement) => {
        element.classList.remove("seat--drag-preview");
        // Также убираем класс selecto-selection если он есть
        element.classList.remove("selecto-selection");
      });
    }
  };

  const handleSeatHover = (hoveredSeat: SeatDisplay, hoverStart: boolean) => {
    // Find the grouped seat object associated with the hovered element
    const seatObject = availableSeats.find((s) => s.id === hoveredSeat.id);
    if (!seatObject) return;

    // Update the styling of the hovered seat
    const seatElement = document.querySelector<SVGElement>(
      seatObject.cssSelector
    );
    if (!seatElement) return;
    if (hoverStart) {
      seatElement.classList.add("seat--hover");
    } else {
      seatElement.classList.remove("seat--hover");
    }

    // If group selection is enabled, add the hover effect to all seats in the current group
    if (selectionMethod === "group" && currentGroup) {
      const groupSeats = findSeatsInGroup(seatObject, currentGroup);

      for (const groupSeat of groupSeats) {
        const groupSeatElement = document.querySelector<SVGElement>(
          groupSeat.cssSelector
        );
        if (!groupSeatElement) continue;
        if (hoverStart) {
          groupSeatElement.classList.add("seat--hover");
        } else {
          groupSeatElement.classList.remove("seat--hover");
        }
      }
    }
  };

  const availableSeatDisplays = useMemo(
    () =>
      availableSeats.map((seat) => ({
        id: seat.id,
        cssSelector: seat.cssSelector,
        // Сохраняем все важные данные для tooltip
        objectType: seat.objectType,
        row: seat.row,
        place: seat.place,
        zone: seat.zone,
        color:
          seat.displayGroup &&
          typeof displayGroupMapping?.[seat.displayGroup] === "string"
            ? (displayGroupMapping?.[seat.displayGroup] as string)
            : undefined,
        icon:
          seat.displayGroup &&
          typeof displayGroupMapping?.[seat.displayGroup] !== "string"
            ? displayGroupMapping?.[seat.displayGroup]
            : undefined,
        selected: false,
      })),
    [availableSeats, displayGroupMapping]
  );

  const selectionControls = useMemo(() => {
    const selectionControls = [];

    if (withGroupSelection) {
      // Get all the unique sorting groups from the available seats
      const groups = availableSeats
        .map((seat) => {
          if (seat.selectionGroups) return Object.keys(seat.selectionGroups);
        })
        .flat();

      // Remove duplicates and filter out undefined values
      const uniqueGroups = Array.from(new Set(groups)).filter(
        (group) => group !== undefined
      );

      selectionControls.push(
        ...uniqueGroups.map((group) => (
          <button
            key={group}
            type="button"
            className={
              "seatmap__action" +
              (selectionMethod === "group" && currentGroup === group
                ? " seatmap__action--selected"
                : "")
            }
            onClick={() => {
              if (selectionMethod === "group" && currentGroup === group) {
                setSelectionMethod(null);
                setCurrentGroup(null);
              } else {
                setSelectionMethod("group");
                setCurrentGroup(group);
              }
            }}
          >
            {Array.from(group)[0]}
          </button>
        ))
      );
    }

    if (withDragSelection) {
      // Generate the control for dragging and selecting seats
      selectionControls.push(
        <button
          key="multi-select"
          type="button"
          className={
            "seatmap__action" +
            (selectionMethod === "drag" ? " seatmap__action--selected" : "")
          }
          onClick={() =>
            selectionMethod === "drag"
              ? setSelectionMethod(null)
              : setSelectionMethod("drag")
          }
          title="Lasso select"
        >
          <svg
            className="seatmap__icon seatmap__icon--zoom-in"
            viewBox="0 -960 960 960"
          >
            <title>Lasso select</title>
            <path d="m161-516-80-8q6-46 20.5-89.5T141-696l68 42q-20 31-31.5 66T161-516Zm36 316q-33-32-57-70.5T101-352l76-26q12 35 31 65.5t45 56.5l-56 56Zm110-552-42-68q39-25 82.5-39.5T437-880l8 80q-37 5-72 16.5T307-752ZM479-82q-35 0-69.5-5.5T343-106l26-76q27 9 54 14.5t56 5.5v80Zm226-626q-26-26-56.5-45T583-784l26-76q43 15 81.5 39t70.5 57l-56 56Zm86 594L679-226v104h-80v-240h240v80H735l112 112-56 56Zm8-368q0-29-5.5-56T779-592l76-26q13 32 18.5 66.5T879-482h-80Z" />
          </svg>
        </button>
      );
    }

    return selectionControls;
  }, [
    availableSeats,
    currentGroup,
    selectionMethod,
    withDragSelection,
    withGroupSelection,
  ]);

  const combinedLeftControls = useMemo(() => {
    const combinedControls = [];

    if (selectionControls && selectionControls.length) {
      combinedControls.push(selectionControls);
    }
    if (leftControls && leftControls.length) {
      combinedControls.push(...leftControls);
    }
    return combinedControls;
  }, [leftControls, selectionControls]);

  return (
    <>
      {selectionMethod === "drag" && (
        <Selecto
          // The container to add a selection element
          container={document.body}
          // The area to drag selection element (default: container)
          dragContainer={window}
          // Targets to select. You can register a queryselector or an Element.
          selectableTargets={[
            ".seatmap__svg circle",
            ".seatmap__svg path", 
            ".seatmap__svg ellipse",
            ".seatmap__svg rect",
            ".seatmap__svg polygon"
          ]}
          // Whether to select by click (default: true)
          selectByClick={false}
          // Whether to select from the target inside (default: true)
          selectFromInside={true}
          // After the select, whether to select the next target with the selected target (deselected if the target is selected again).
          continueSelect={false}
          // Determines which key to continue selecting the next target via keydown and keyup.
          toggleContinueSelect={"shift"}
          // The container for keydown and keyup events
          keyContainer={window}
          // The rate at which the target overlaps the drag area to be selected. (default: 100)
          hitRate={30}
          // Prevent selection when clicking
          preventClickEventOnDrag={true}
          onSelectStart={() => {
            // Блокируем обычные клики во время drag selection
            document.body.style.userSelect = 'none';
            
            // НЕ очищаем предыдущее выделение при начале нового - это вызывало закрытие виджета!
            // Пользователь может хотеть добавить к существующему выделению
            
            // Принудительно очищаем все классы выделения Selecto
            const selectoElements = document.querySelectorAll('.selecto-selection, .selecto-drag, .selecto-hover, .seat--drag-preview');
            selectoElements.forEach(element => {
              element.classList.remove('selecto-selection', 'selecto-drag', 'selecto-hover', 'seat--drag-preview');
            });
          }}
          onSelect={handleHoverMultiSelect}
          onSelectEnd={(e) => {
            // Восстанавливаем обычные клики после drag selection
            document.body.style.userSelect = '';
            
            // Проверяем, есть ли действительно добавленные элементы
            // Если есть только removed элементы, но нет added - это означает, что Selecto
            // неправильно определил состояние элементов из-за класса .seat--selected
            if (e.added && e.added.length > 0) {
              // Обрабатываем выделение только если есть действительно добавленные элементы
              handleSeatMultiSelect(e);
            } else if (e.removed && e.removed.length > 0 && (!e.added || e.added.length === 0)) {
              // Если есть только removed элементы, но нет added - игнорируем это событие
              // Это происходит когда Selecto неправильно определяет состояние элементов
              return;
            } else {
              // Обрабатываем выделение в остальных случаях
              handleSeatMultiSelect(e);
            }
            
            // Дополнительная очистка классов Selecto
            setTimeout(() => {
              const selectoElements = document.querySelectorAll('.selecto-selection, .selecto-drag, .selecto-hover, .seat--drag-preview');
              selectoElements.forEach(element => {
                element.classList.remove('selecto-selection', 'selecto-drag', 'selecto-hover', 'seat--drag-preview');
              });
            }, 150);
          }}
        />
      )}
      <RawSeatmap
        svg={svg}
        availableSeats={availableSeatDisplays}
        selectedSeatIds={selectedSeatIds}
        zones={zones}
        onSeatSelect={(s) => handleSeatSelect(s, true)}
        onSeatDeselect={(s) => handleSeatSelect(s, false)}
        onSeatHover={(s) => handleSeatHover(s, true)}
        onSeatHoverEnd={(s) => handleSeatHover(s, false)}
        leftControls={combinedLeftControls}
        rightControls={rightControls}
        allowDragAndPan={selectionMethod !== "drag"}
        selectionMode={selectionMethod === "drag" ? "drag" : "click"}
      />
    </>
  );
};
