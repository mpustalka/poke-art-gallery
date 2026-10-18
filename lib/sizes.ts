export type PrintSize = {
  label: string
  detail: string
  price: number
  width: number
  height: number
}

export type SizeGroup = {
  id: string
  name: string
  type: string
  color: 'red' | 'yellow' | 'blue'
  sizes: PrintSize[]
}

export const sizeGroups: SizeGroup[] = [
  {
    id: 'prints',
    name: 'Art Prints',
    type: 'Basic',
    color: 'red',
    sizes: [
      { label: '4 x 4', detail: 'Square print', price: 3.5, width: 4, height: 4 },
      { label: '4 x 6', detail: 'Classic print', price: 5, width: 4, height: 6 },
      { label: '5 x 7', detail: 'Classic print', price: 7.5, width: 5, height: 7 },
      { label: '8 x 10', detail: 'Large print', price: 10, width: 8, height: 10 },
      { label: '11 x 14', detail: 'Large print', price: 15, width: 11, height: 14 },
      { label: '12 x 12', detail: 'Square print', price: 14.99, width: 12, height: 12 },
    ],
  },
  {
    id: 'framed',
    name: 'Framed & Matted',
    type: 'Evolved',
    color: 'yellow',
    sizes: [
      { label: '4 x 6 Wooden', detail: 'Mounted on wood', price: 8.5, width: 4, height: 6 },
      { label: '8 x 10 Matted', detail: 'Matted to fit a 5 x 7', price: 15, width: 8, height: 10 },
      {
        label: '11 x 14 Framed',
        detail: 'Front-loading frame, matted to 8 x 10',
        price: 17.5,
        width: 11,
        height: 14,
      },
    ],
  },
  {
    id: 'posters',
    name: 'Posters',
    type: 'Legendary',
    color: 'blue',
    sizes: [
      { label: '18 x 24', detail: 'Poster', price: 19.99, width: 18, height: 24 },
      { label: '20 x 30', detail: 'Poster', price: 29.99, width: 20, height: 30 },
    ],
  },
]

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}
