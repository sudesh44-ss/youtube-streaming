export interface MusicTrack {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
  views?: string;
  category: string;
  album?: string;
}

export interface MusicCategory {
  id: string;
  name: string;
  query: string;
  icon?: string;
}
