export interface BlogPost {
  id: string;
  title: string;
  content: string;
  date: string;
}

export type Thought = {
  id: string;
  content: string;
  timestamp: string;
  image?: string;
};

export interface AboutPage {
  content: string;
}
