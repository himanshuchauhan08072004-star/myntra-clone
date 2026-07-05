import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
} from "react-native-reanimated";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  delay?: number;
};

/**
 * Wraps any card in a spring press-scale + staggered fade/slide entrance.
 * Drop-in replacement for TouchableOpacity where you want it to feel alive.
 */
export default function AnimatedCard({ children, onPress, style, delay = 0 }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(420).springify()} style={style}>
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            scale.value = withSpring(0.95, { damping: 14 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 10 });
          }}
        >
          {children}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
