import { dietLabel } from '../../constants/food';
import './DietBadge.scss';

// The familiar square-and-dot mark: green for veg, amber for egg, red for non-veg.
// Items created before dietary information was collected show nothing.
const DietBadge = ({ diet, showLabel = false }) => {
  if (!diet) return null;
  const label = dietLabel(diet);
  return (
    <span className={`dietBadge ${diet}`} title={label}>
      <span className="mark" role="img" aria-label={label} />
      {showLabel && <span className="label">{label}</span>}
    </span>
  );
};

export default DietBadge;
