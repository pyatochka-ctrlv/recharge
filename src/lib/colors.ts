/** Послідовна рожева шкала для величин (енергія, настрій): одна гама — від світлого до насиченого. */
export const ENERGY_STEPS = ['#FCE4EF', '#FBC4DC', '#F78FBE', '#EE4E9C', '#C2187A'];
export const energyColor = (e: number | null) => (e == null ? 'transparent' : ENERGY_STEPS[Math.min(4, Math.floor(e / 20))]);
