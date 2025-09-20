export interface SVGElementInfo {
  element: SVGElement;
  cssSelector: string;
  hasId: boolean;
  position: { x: number; y: number; width: number; height: number };
}

export const extractSVGElements = (svgString: string): SVGElementInfo[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  
  // Ищем все потенциальные элементы мест
  const elements = doc.querySelectorAll('circle, path, ellipse, rect, polygon');
  const result: SVGElementInfo[] = [];
  
  elements.forEach((element, index) => {
    const svgElement = element as SVGElement;
    const hasId = !!svgElement.id;
    
    // Генерируем CSS селектор
    let cssSelector: string;
    if (hasId) {
      cssSelector = `#${svgElement.id}`;
    } else {
      // Используем селектор по тегу и индексу
      cssSelector = `${svgElement.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
    }
    
    // Получаем позицию элемента
    const bbox = (svgElement as SVGGraphicsElement).getBBox();
    
    result.push({
      element: svgElement,
      cssSelector,
      hasId,
      position: {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      }
    });
  });
  
  return result;
};

export const getSVGElementPosition = (element: SVGElement): { x: number; y: number } => {
  const bbox = (element as SVGGraphicsElement).getBBox();
  return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
};