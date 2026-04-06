export interface Part {
  id?: string;
  _id?: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  description: string;
  compatibility: string[]; // e.g. ["F-150 2015-2020", "Mustang 2018+"]
  stock: number;
}

export interface CartItem extends Part {
  quantity: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
