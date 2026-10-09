import PublicIcon from '@mui/icons-material/Public';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CategoryIcon from '@mui/icons-material/Category';

// Visual metadata per challenge_type (general | keyword | journal | wos_category).
// color maps to a theme palette key.
export const TYPE_META = {
  general:      { icon: PublicIcon,     label: 'General',      color: 'primary' },
  keyword:      { icon: LocalOfferIcon, label: 'Keyword',      color: 'secondary' },
  journal:      { icon: MenuBookIcon,   label: 'Journal',      color: 'info' },
  wos_category: { icon: CategoryIcon,   label: 'WoS Category', color: 'success' },
};

export const getTypeMeta = (type) => TYPE_META[type] || TYPE_META.general;
