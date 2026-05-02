export interface QuizAccessOptions {
  path: string;
  previewRouteMarkers: string[];
}

export const isGuestPreviewRoute = ({
  path,
  previewRouteMarkers,
}: QuizAccessOptions): boolean =>
  previewRouteMarkers.some((marker) => path.includes(marker));
