import { Part } from './types';

export const FORD_PARTS: Part[] = [
  {
    id: '1',
    name: 'Motorcraft Brake Pads',
    category: 'Brakes',
    price: 85.00,
    image: 'https://picsum.photos/seed/brakepads/400/300',
    description: 'Original Motorcraft brake pads for Ford F-150. High durability and low noise.',
    compatibility: ['F-150 2015-2023', 'Expedition 2018+'],
    stock: 24
  },
  {
    id: '2',
    name: 'Oil Filter FL-820S',
    category: 'Engine',
    price: 12.50,
    image: 'https://picsum.photos/seed/oilfilter/400/300',
    description: 'Genuine Motorcraft oil filter for V8 engines. Ensures clean oil flow.',
    compatibility: ['Mustang 2005-2023', 'F-150 5.0L'],
    stock: 150
  },
  {
    id: '3',
    name: 'Spark Plug Set (8pcs)',
    category: 'Electrical',
    price: 96.00,
    image: 'https://picsum.photos/seed/sparkplug/400/300',
    description: 'Iridium spark plugs for maximum performance and fuel efficiency.',
    compatibility: ['Mustang GT 2011-2023', 'Explorer 3.5L EcoBoost'],
    stock: 45
  },
  {
    id: '4',
    name: 'Air Filter FA-1883',
    category: 'Engine',
    price: 28.00,
    image: 'https://picsum.photos/seed/airfilter/400/300',
    description: 'Replacement engine air filter for better airflow and engine protection.',
    compatibility: ['Focus 2012-2018', 'Escape 2013-2019'],
    stock: 60
  },
  {
    id: '5',
    name: 'Front Strut Assembly',
    category: 'Suspension',
    price: 145.00,
    image: 'https://picsum.photos/seed/strut/400/300',
    description: 'Complete front strut assembly for a smooth and stable ride.',
    compatibility: ['Fusion 2013-2020', 'Edge 2015+'],
    stock: 12
  },
  {
    id: '6',
    name: 'Headlight Assembly (Left)',
    category: 'Body',
    price: 320.00,
    image: 'https://picsum.photos/seed/headlight/400/300',
    description: 'OEM style headlight assembly with LED daytime running lights.',
    compatibility: ['F-150 2018-2020'],
    stock: 5
  },
  {
    id: '7',
    name: 'Alternator 200 Amp',
    category: 'Electrical',
    price: 210.00,
    image: 'https://picsum.photos/seed/alternator/400/300',
    description: 'High-output alternator for heavy-duty electrical demands.',
    compatibility: ['Super Duty F-250/F-350 2017+'],
    stock: 8
  },
  {
    id: '8',
    name: 'Transmission Filter Kit',
    category: 'Transmission',
    price: 45.00,
    image: 'https://picsum.photos/seed/transfilter/400/300',
    description: 'Complete kit including filter and gasket for 6R80 transmissions.',
    compatibility: ['F-150 2009-2017', 'Mustang 2011-2017'],
    stock: 20
  }
];
