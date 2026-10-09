import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Box } from '@mui/material';

const KeywordCloud = ({ keywords }) => {
  // Convert keywords to treemap format
  const data = Object.entries(keywords)
    .map(([name, size]) => ({
      name,
      size,
      fill: getColor(size)
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 50); // Top 50 keywords

  function getColor(size) {
    // Generate color based on frequency (darker = more frequent)
    const blues = [
      '#42a5f5', // lightest (más oscuro)
      '#2196f3',
      '#1e88e5',
      '#1976d2', // primary.main
      '#1565c0',
      '#0d47a1', // darkest
    ];
    
    const maxSize = Math.max(...Object.values(keywords));
    const intensity = Math.floor((size / maxSize) * (blues.length - 1));
    return blues[Math.min(intensity, blues.length - 1)];
  }

  const CustomContent = (props) => {
    const { x, y, width, height, name, size } = props;
    
    // Only show text if the rectangle is big enough
    const minWidth = 60;
    const minHeight = 30;
    
    if (width < minWidth || height < minHeight) {
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            style={{
              fill: props.fill,
            }}
          />
        </g>
      );
    }

    // Calculate font size based on rectangle size
    const fontSize = Math.min(width / 8, height / 3, 16);

    // Determine text color based on background brightness
    // Light backgrounds need dark text, dark backgrounds need light text
    const getTextColor = (bgColor) => {
      // Extract RGB values from hex color
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // Calculate perceived brightness (0-255)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // Return dark text for light backgrounds, light text for dark backgrounds
      return brightness > 155 ? '#1a1a1a' : '#ffffff';
    };

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: props.fill,
            cursor: 'pointer',
          }}
        />
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: getTextColor(props.fill),
            fontSize: `${fontSize}px`,
            fontWeight: 'normal',
            fontFamily: 'Roboto, Arial, sans-serif',
            pointerEvents: 'none',
          }}
        >
          {name}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: 1,
            p: 1.5,
            boxShadow: 2,
          }}
        >
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].payload.name}</p>
          <p style={{ margin: '4px 0 0 0', color: '#1976d2' }}>
            Count: {payload[0].value}
          </p>
        </Box>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data}
        dataKey="size"
        stroke="#fff"
        fill="#1976d2"
        content={<CustomContent />}
        animationDuration={500}
      >
        <Tooltip content={<CustomTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  );
};

export default KeywordCloud;
