import { offsetKm } from '../utils/geo';

// Coordinates are stored as km offsets from the donor's real (or fallback)
// location rather than fixed absolute points, so the demo requests always
// land near wherever the app is actually being used instead of a hardcoded
// city on the other side of the world.
const REQUEST_TEMPLATES = [
  {
    id: 1,
    bloodType: 'O+',
    hospital: 'City General Hospital',
    hospitalOffsetKm: { dLat: 1.8, dLng: 1.2 },
    recipientName: 'Marie K.',
    recipientOffsetKm: { dLat: 0.5, dLng: -0.3 },
    distance: '2.4 km away',
    bagsNeeded: 4,
    bagsAccepted: 3,
    urgency: 'Critical',
    time: '2 mins ago',
    compatible: true,
  },
  {
    id: 2,
    bloodType: 'A+',
    hospital: "St. Mary's Medical Center",
    hospitalOffsetKm: { dLat: -2.6, dLng: 2.9 },
    recipientName: 'Daniel T.',
    recipientOffsetKm: { dLat: -0.4, dLng: 0.6 },
    distance: '3.8 km away',
    bagsNeeded: 2,
    bagsAccepted: 1,
    urgency: 'Urgent',
    time: '10 mins ago',
    compatible: true,
  },
  {
    id: 3,
    bloodType: 'AB+',
    hospital: 'Regional Blood Center',
    hospitalOffsetKm: { dLat: 4.1, dLng: -2.1 },
    recipientName: 'Grace N.',
    recipientOffsetKm: { dLat: 1.1, dLng: 0.9 },
    distance: '5.2 km away',
    bagsNeeded: 3,
    bagsAccepted: 2,
    urgency: 'Urgent',
    time: '18 mins ago',
    compatible: true,
  },
];

export function resolveRequests(anchor) {
  return REQUEST_TEMPLATES.map((template) => {
    const { hospitalOffsetKm, recipientOffsetKm, ...rest } = template;
    return {
      ...rest,
      hospitalCoords: offsetKm(anchor, hospitalOffsetKm.dLat, hospitalOffsetKm.dLng),
      recipientCoords: offsetKm(anchor, recipientOffsetKm.dLat, recipientOffsetKm.dLng),
    };
  });
}
