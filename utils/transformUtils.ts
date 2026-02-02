
import { SVGElementData } from '../types';

export interface AccumulatedTransform {
  x: number;
  y: number;
  rotation: number; // degrees
  scale: number;
}

export function getAccumulatedTransform(
  elementId: string,
  allElements: ReadonlyArray<SVGElementData>
): AccumulatedTransform {
  let accX = 0;
  let accY = 0;
  let accRotation = 0;
  let accScale = 1;

  const path: SVGElementData[] = [];
  let currentElementInHierarchy = allElements.find(el => el.id === elementId);

  while (currentElementInHierarchy) {
    path.unshift(currentElementInHierarchy); // Add to the beginning to process from root parent down to element
    currentElementInHierarchy = currentElementInHierarchy.parentId
      ? allElements.find(el => el.id === currentElementInHierarchy!.parentId)
      : undefined;
  }

  for (const el of path) {
    const elX = el.x || 0;
    const elY = el.y || 0;
    const elRotation = el.rotation || 0;
    const elScale = el.scale || 1;

    // 1. Apply existing accumulated scale to current element's translation components
    const scaledElX = elX * accScale;
    const scaledElY = elY * accScale;

    // 2. Rotate these scaled translation components by existing accumulated rotation
    const angleRad = accRotation * (Math.PI / 180);
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const rotatedAndScaledElX = scaledElX * cosA - scaledElY * sinA;
    const rotatedAndScaledElY = scaledElX * sinA + scaledElY * cosA;

    // 3. Add this transformed translation to the total accumulated translation
    accX += rotatedAndScaledElX;
    accY += rotatedAndScaledElY;

    // 4. Accumulate rotation and scale for the next level/element itself
    //    (Order matters: scale first, then rotate for the current element's contribution to frame)
    accRotation += elRotation;
    accScale *= elScale;
  }

  return {
    x: accX,
    y: accY,
    rotation: accRotation,
    scale: accScale,
  };
}

export function domMatrixToSVGMatrix(svgElement: SVGSVGElement, domMatrix: DOMMatrixReadOnly | DOMMatrix): SVGMatrix {
  const svgMatrix = svgElement.createSVGMatrix();
  svgMatrix.a = domMatrix.a;
  svgMatrix.b = domMatrix.b;
  svgMatrix.c = domMatrix.c;
  svgMatrix.d = domMatrix.d;
  svgMatrix.e = domMatrix.e;
  svgMatrix.f = domMatrix.f;
  return svgMatrix;
}
