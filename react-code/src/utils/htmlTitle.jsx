// Strips HTML tags for plain-text contexts (activity feeds, truncations)
export const stripHtml = (html) => html?.replace(/<[^>]*>/g, '') ?? '';

// Renders a title that may contain safe HTML like <i>, <sub>, <sup>
export const HtmlTitle = ({ html, sx, style, className }) => (
  <span
    dangerouslySetInnerHTML={{ __html: html ?? '' }}
    style={style}
    className={className}
  />
);
