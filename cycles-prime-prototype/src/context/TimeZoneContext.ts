import { createContext } from 'react';

export type TimeZonePref = 'utc' | 'local';

// Default to UTC — today's behaviour, matches how trading desks read cutoffs.
// Users who prefer reading times in their local zone can flip this in Settings.
export const TimeZoneContext = createContext<TimeZonePref>('utc');
