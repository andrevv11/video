export interface Video {
  url: string;
  title?: string;
  text?: string;
}

export type PanelId = 'a' | 'b';

export interface GalleryState {
  playlist: Video[];
  current: number;
  activePanel: PanelId;
  isSliding: boolean;
  isMuted: boolean;
  isInfoOpen: boolean;
}
