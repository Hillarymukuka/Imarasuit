// Major cities and towns in Zambia
export const ZAMBIAN_CITIES = [
  'Lusaka',
  'Kitwe',
  'Ndola',
  'Kabwe',
  'Chingola',
  'Mufulira',
  'Luanshya',
  'Livingstone',
  'Kasama',
  'Chipata',
  'Solwezi',
  'Mansa',
  'Mongu',
  'Choma',
  'Mazabuka',
  'Kafue',
  'Kalulushi',
  'Chililabombwe',
  'Monze',
  'Kapiri Mposhi',
  'Nakonde',
  'Mpika',
  'Siavonga',
  'Petauke',
  'Kaoma',
  'Senanga',
  'Kawambwa',
  'Mbala',
  'Samfya',
  'Nchelenge',
  'Chirundu',
  'Sesheke',
  'Katete',
  'Lundazi',
  'Isoka',
  'Mumbwa',
  'Chinsali',
  'Kalomo',
  'Zimba',
  'Namwala',
] as const;

export type ZambianCity = (typeof ZAMBIAN_CITIES)[number];

// Shipment status progression (cannot go backwards)
export const SHIPMENT_STATUS_ORDER = [
  'registered',
  'dispatched',
  'in_transit',
  'arrived',
  'delivered',
] as const;

// Container status progression
export const CONTAINER_STATUS_ORDER = [
  'loading',
  'sealed',
  'in_transit',
  'arrived',
  'delivered',
] as const;

// Delivery status progression
export const DELIVERY_STATUS_ORDER = [
  'pending',
  'assigned',
  'picked_up',
  'in_transit',
  'delivered',
] as const;
