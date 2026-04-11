// Circular SVG progress ring — calorie summary on Dashboard and Profile hero.
import { View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Colors, FONTS } from '@/constants/Colors';

interface Props {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}
export function MacroRing({ consumed, goal, size = 160, strokeWidth = 14 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const dashOffset = circumference * (1 - progress);
  const cx = size / 2;
  const cy = size / 2;
  const pct = Math.round(progress * 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={Colors.surfaceContainerHighest}
          strokeWidth={strokeWidth}
          fill="transparent"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
        {/* Progress */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={Colors.primary}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
        {/* Centre % — perfectly centered */}
        <SvgText
          x={cx}
          y={cy - 7}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={28}
          fontFamily={FONTS.extraBold}
          fill={Colors.onSurface}
        >
          {pct}%
        </SvgText>
        {/* Centre sub-label */}
        <SvgText
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={11}
          fontFamily={FONTS.medium}
          fill={Colors.onSurfaceVariant}
        >
          {consumed} cal
        </SvgText>
      </Svg>
    </View>
  );
}

// Compact white-on-red variant for use inside the red hero card.
export function MacroRingHero({ consumed, goal, size = 100, strokeWidth = 10 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const dashOffset = circumference * (1 - progress);
  const cx = size / 2;
  const cy = size / 2;
  const pct = Math.round(progress * 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx} cy={cy} r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="transparent"
          rotation="-90" origin={`${cx}, ${cy}`}
        />
        <Circle
          cx={cx} cy={cy} r={radius}
          stroke={Colors.secondaryFixed}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90" origin={`${cx}, ${cy}`}
        />
        <SvgText x={cx} y={cy - 5} textAnchor="middle" alignmentBaseline="middle" fontSize={20} fontFamily={FONTS.extraBold} fill="#fff">
          {pct}%
        </SvgText>
        <SvgText x={cx} y={cy + 13} textAnchor="middle" alignmentBaseline="middle" fontSize={10} fontFamily={FONTS.medium} fill="rgba(255,255,255,0.7)">
          {consumed} cal
        </SvgText>
      </Svg>
    </View>
  );
}
