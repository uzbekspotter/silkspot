export interface Aircraft {
  registration: string;
  type: string;
  operator: string;
  age: string;
  status: 'ACTIVE' | 'STORED' | 'SCRAPPED';
  lastTracked?: string;
  details?: string;
}

export interface Photo {
  id: string;
  url: string;
  title: string;
  subtitle: string;
  location: string;
  tag?: string;
  featured?: boolean;
}

export interface Spotter {
  name: string;
  location: string;
  joinedDate: string;
  rank: string;
  uploads: number;
  views: string;
  likes: string;
  aircraftTypes: number;
  avatar: string;
  coverImage: string;
}

export type Page =
  | 'explore'
  | 'map'
  | 'fleet'
  | 'community'
  | 'stats'
  | 'about'
  | 'about-wake'
  | 'profile'
  | 'upload'
  | 'aircraft-detail'
  | 'photo-detail'
  | 'login'
  | 'register'
  | 'admin'
  | 'settings';
