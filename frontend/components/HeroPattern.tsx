// Subtle dot-grid SVG watermark — used inside red hero sections.
// Approximates the stitch "radial-gradient dot" Maryland flag overlay at low opacity.
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

interface Props {
  opacity?: number;
}

export function HeroPattern({ opacity = 0.12 }: Props) {
  return (
    <Svg style={[StyleSheet.absoluteFill, { opacity }]} width="100%" height="100%">
      <Defs>
        <Pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <Circle cx="2" cy="2" r="1.5" fill="white" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}
