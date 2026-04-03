export interface CoordinateTransformer {
  readonly screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
}

export const createCoordinateTransformer = function(
  svgContainer: SVGSVGElement,
  contentRoot: SVGElement
): CoordinateTransformer {
  const svgPoint = svgContainer.createSVGPoint();

  const screenToSvgCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    svgPoint.x = clientX;
    svgPoint.y = clientY;
    const ctm = (contentRoot as unknown as SVGGraphicsElement).getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const t = svgPoint.matrixTransform(ctm.inverse());
    return { x: t.x, y: t.y };
  };

  return { screenToSvgCoords };
};
