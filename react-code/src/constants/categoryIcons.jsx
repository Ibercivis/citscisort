import BiotechIcon from '@mui/icons-material/Biotech';
import PsychologyIcon from '@mui/icons-material/Psychology';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import GavelIcon from '@mui/icons-material/Gavel';
import MenuBookIcon from '@mui/icons-material/MenuBook';

const ICON_MAP = {
  Biotech: BiotechIcon,
  Psychology: PsychologyIcon,
  HelpOutline: HelpOutlineIcon,
  Groups: GroupsIcon,
  FactCheck: FactCheckIcon,
  AccountTree: AccountTreeIcon,
  TrendingUp: TrendingUpIcon,
  SmartToy: SmartToyIcon,
  Gavel: GavelIcon,
  MenuBook: MenuBookIcon,
};

export const getCategoryIcon = (iconName) => ICON_MAP[iconName] || null;

export default ICON_MAP;
