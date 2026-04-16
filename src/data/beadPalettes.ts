export type BeadBrand = 'perler' | 'hama' | 'artkal';

export type BeadColor = {
  id: string;
  name: string;
  hex: string;
};

export type BeadBrandDefinition = {
  id: BeadBrand;
  label: string;
  colors: BeadColor[];
};

export const BEAD_BRANDS: Record<BeadBrand, BeadBrandDefinition> = {
  perler: {
    id: 'perler',
    label: 'Perler',
    colors: [
      { id: 'P01', name: 'Black', hex: '#1a1a1a' },
      { id: 'P02', name: 'White', hex: '#f7f3e8' },
      { id: 'P03', name: 'Red', hex: '#c5423f' },
      { id: 'P04', name: 'Orange', hex: '#de7b36' },
      { id: 'P05', name: 'Yellow', hex: '#f0c94f' },
      { id: 'P06', name: 'Dark Green', hex: '#2f6c4d' },
      { id: 'P07', name: 'Light Blue', hex: '#6db6d9' },
      { id: 'P08', name: 'Purple', hex: '#7b67a5' },
      { id: 'P09', name: 'Pink', hex: '#d98aa6' },
      { id: 'P10', name: 'Brown', hex: '#7d5a43' },
    ],
  },
  hama: {
    id: 'hama',
    label: 'Hama',
    colors: [
      { id: 'H18', name: 'Black', hex: '#1f1d1d' },
      { id: 'H01', name: 'White', hex: '#f2efe7' },
      { id: 'H04', name: 'Red', hex: '#b84543' },
      { id: 'H03', name: 'Yellow', hex: '#e8c84b' },
      { id: 'H05', name: 'Blue', hex: '#3c74b5' },
      { id: 'H06', name: 'Green', hex: '#3f7d52' },
      { id: 'H08', name: 'Brown', hex: '#7a5a46' },
      { id: 'H09', name: 'Beige', hex: '#d8c0a0' },
      { id: 'H11', name: 'Pastel Pink', hex: '#dfa0b6' },
      { id: 'H12', name: 'Pastel Purple', hex: '#a091c3' },
    ],
  },
  artkal: {
    id: 'artkal',
    label: 'Artkal',
    colors: [
      { id: 'C01', name: 'Black', hex: '#121212' },
      { id: 'C02', name: 'White', hex: '#f8f6ef' },
      { id: 'C05', name: 'Cherry', hex: '#d24d4b' },
      { id: 'C07', name: 'Pumpkin', hex: '#df8441' },
      { id: 'C11', name: 'Lemon', hex: '#f0d15d' },
      { id: 'C16', name: 'Sky', hex: '#6eaed8' },
      { id: 'C20', name: 'Mint', hex: '#62a184' },
      { id: 'C25', name: 'Lavender', hex: '#8e79b9' },
      { id: 'C33', name: 'Rose', hex: '#d78fa5' },
      { id: 'C47', name: 'Sand', hex: '#d5bf96' },
    ],
  },
};
