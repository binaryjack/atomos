export interface CoordinateTransformer {
  readonly screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
  readonly startCachingCoords: () => void;
  readonly stopCachingCoords: () => void;
}

export const createCoordinateTransformer = function(
  svgContainer: SVGSVGElement,
  contentRoot: SVGElement
): CoordinateTransformer {
  let cachedInverseCtm: DOMMatrix | null = null;

  const startCachingCoords = (): void => {
    const ctm = (contentRoot as unknown as SVGGraphicsElement).getScreenCTM();
    cachedInverseCtm = ctm ? ctm.inverse() : null;
  };

  const stopCachingCoords = (): void => {
    cachedInverseCtm = null;
  };

  const svgPoint = svgContainer.createSVGPoint();

  const screenToSvgCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    svgPoint.x = clientX;
    svgPoint.y = clientY;
    const inv = cachedInverseCtm || (contentRoot as unknown as SVGGraphicsElement).getScreenCTM()?.inverse();
    if (!inv) return { x: clientX, y: clientY };
    const t = svgPoint.matrixTransform(inv);
    return { x: t.x, y: t.y };
  };

  return { screenToSvgCoords, startCachingCoords, stopCachingCoords };
};
