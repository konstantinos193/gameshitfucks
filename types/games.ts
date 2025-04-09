// types/games.ts
export interface Screenshot {
    id: number;
    title: string;
    slug: string;
    year: number;
    rating: number;
    image: string;
  }
  
  export interface Game {
    id: number;
    title: string;
    slug: string;
    year: number;
    hits: string;
    rating: number;
    genre: string;
    playTime: string;
    players: string;
    coverImage: string;
    bannerImage: string;
    description: string[];
    features: string[];
    screenshots: string[];
    similarGames: Screenshot[];
  }
  
  export type GamesData = {
    [key: string]: Game;
  }