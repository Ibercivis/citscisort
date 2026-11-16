import { ReferenceLine } from 'recharts';

export const fmtDay = (iso, opts = { day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, opts);

// Vertical markers on the days we sent emails (label = number sent).
export const sendMarkers = (sends, theme) => (sends || []).map((s) => (
  <ReferenceLine
    key={`${s.kind}-${s.date}-${s.label}`}
    x={fmtDay(s.date)}
    stroke={theme.palette.text.secondary}
    strokeDasharray="4 3"
    label={{ value: `\u2709 ${s.sent}`, position: 'top', fill: theme.palette.text.secondary, fontSize: 11 }}
  />
));
