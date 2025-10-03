import {
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';

interface AtlasCardProps {
  title: string;
  description?: string;
  tags?: string[];
  href: string;
  eyebrow?: string;
}

export const AtlasCard = ({ title, description, tags = [], href, eyebrow }: AtlasCardProps) => {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea component={Link} href={href} sx={{ height: '100%' }}>
        <CardContent>
          <Stack spacing={1.5}>
            {eyebrow && (
              <Typography variant="overline" color="text.secondary">
                {eyebrow}
              </Typography>
            )}
            <Typography variant="h6">{title}</Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
            {tags.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {tags.slice(0, 4).map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default AtlasCard;
